angular.module('app', [])

.controller('appController', function($scope, $timeout, $q, coursesService){
    let self = this;
    
    self.messages = new MessageManager($timeout);
    self.hasCourseDetails = false; //Used to show/hide ui stuff, only used for single course
    self.downloading = false;
    self.halted = false; //triggered by stop

    self.pullSingleClass = false; //Pull one class
    self.pullManyClasses = false; //Automatically pull classes till stopped


    self.courseId; //Input course Id, only used for single course
    self.course; //Course details
    self.parallelism = 2; //Number of parallel downloads
    self.pullAssigned = true;

    self.getSingleCourseDetails = getSingleCourseDetails; //only used for single course
    self.reset = reset; //only used for single course
    self.startDownload = startDownload;
    self.stop = stop;
    self.unassignEpisode = unassignEpisode;
    self.unassignAttachment = unassignAttachment;

    self.coursesDownloaded = 0;
    self.episodesDownloaded = 0;
    self.attachmentsDownloaded = 0;
    self.sizeDownloaded = 0;

    self.lastTimeTick = 0;
    self.timeElapsed = 0;

    function stop(){
        self.halted = true;
        self.downloading = false;
    }

    async function startDownload(){
        self.halted = false;    
        self.downloading = true;        
        self.lastTimeTick = new Date().getTime();
        updateTime();

        if(self.pullManyClasses){
            while(true){
                if(self.halted){
                    break;
                }

                let result = await coursesService.getNext();
                let courseId = result.data.data;
                if(isEmpty(courseId)){
                    self.messages.add('error', 'nexterror', 'No course Id for Next, progress halted');
                    break;
                }
                let details = await getCourseDetails(courseId);
                self.course = details.data.data;
                self.hasCourseDetails = true;

                if(isEmpty(details.data.data)){
                    self.messages.add('error', 'nexterror', 'No course data supplied, progress halted');
                    break;
                }   

                prepEpisodes();
                prepAttachments();

                let attachmentWaiters;
                if(self.course.project.hasAttachments){
                    attachmentWaiters = downloadAttachments();
                }

                //Should kick off multiple 'workers'
                let waiters = [];
                for(let i = 0; i < self.parallelism; i++){
                    waiters.push(downloadEpisodes());
                }

                for(let i = 0; i < waiters.length; i++){
                    await waiters[i];
                }

                if(attachmentWaiters){
                    await attachmentWaiters;
                }

                if(!self.halted){
                    await coursesService.setCourseDownloaded(self.course.id);
                    self.coursesDownloaded ++;
                }
            }
        } else if(self.pullSingleClass){
            prepEpisodes();
            prepAttachments();

            let attachmentWaiters = [];
            if(self.course.project.hasAttachments){
                for(let i = 0; i < self.parallelism; i++){
                    attachmentWaiters.push(downloadAttachments());
                }                
            }

            //Should kick off multiple 'workers'
            let waiters = [];
            for(let i = 0; i < self.parallelism; i++){
                waiters.push(downloadEpisodes());
            }

            for(let i = 0; i < waiters.length; i++){
                await waiters[i];
            }

            if(attachmentWaiters.length > 0){
                for(let i = 0; i < waiters.length; i++){
                    await attachmentWaiters[i];
                }                
            }
            await coursesService.setCourseDownloaded(self.course.id);
        }

        self.downloading = false;
    }

    //Sets variables for local download workers
    async function prepEpisodes(){
        for(let i = 0; i < self.course.episodes.length; i++){
            self.course.episodes[i].assigned = false;
            self.course.episodes[i].downloaded = false;
        }
        
        //Used to prioritize larger files first
        self.course.episodes.sort(function(a,b){
            return b.size - a.size;
        })
    }

    //Sets variables for local download workers
    async function prepAttachments(){
        for(let i = 0; i < self.course.project.attachments.length; i++){
            self.course.project.attachments[i].assigned = false;
            self.course.project.attachments[i].downloaded = false;
        }
        
        //Used to prioritize larger files first
        self.course.project.attachments.sort(function(a,b){
            return b.size - a.size;
        })
    }

    async function getNextEpisode(){
        for(let i = 0; i < self.course.episodes.length; i++){
            let episode = self.course.episodes[i];
            if(episode.downloaded == false && episode.assigned == false){
                episode.assigned = true;
                return episode;
            }
        }
        return false;
    }

    async function getNextAttachment(){
        for(let i = 0; i < self.course.project.attachments.length; i++){
            let attachment = self.course.project.attachments[i];
            if(attachment.downloaded == false && attachment.assigned == false){
                attachment.assigned = true;
                return attachment;
            }
        }
        return false;
    }

    async function downloadEpisodes(){
        let next = await getNextEpisode();
        while(next && !self.halted){
            await downloadEpisode(next);
            next = await getNextEpisode();
        }
    }

    async function downloadAttachments(){
        let next = await getNextAttachment();
        while(next && !self.halted){
            await downloadAttachment(next);
            next = await getNextAttachment();
        }
    }
    
    async function downloadEpisode(episode){
        let path = self.course.relativePath;
        let fileName = episode.fileName;
        let url = episode.videoUrl;

        let statusResult = await coursesService.getEpisodeActivity(episode.episodeId);
        let status = statusResult.data.data;
        if(status.downloaded == 1){
            episode.status = 'Done';
            episode.downloaded = true;
            return;
        } else if(status.assigned == 1 && !self.pullAssigned){
            episode.status = 'Assigned';
            return;
        }

        $fileDownload = new FileDownload(episode, $q, $scope, $timeout, coursesService, self.messages);
        episode.status = 'Downloading';
        coursesService.setEpisodeAssigned(episode.episodeId);
        try {
            await $fileDownload.startDownload(url, path, fileName);
            coursesService.setEpisodeDownloaded(episode.episodeId, path+fileName);
            episode.status = 'Done';
            episode.downloaded = true;
            self.episodesDownloaded ++;
            self.sizeDownloaded += episode.size;
        } catch(ex){
            episode.status = 'Failed';
        }        

    }

    async function downloadAttachment(attachment){

        let path = self.course.relativePath;
        let fileName = attachment.sanitizedName;
        let url = encodeURI(attachment.link);

        let statusResult = await coursesService.getAttachmentActivity(attachment.id);
        let status = statusResult.data.data;
        if(status.downloaded == 1){
            attachment.status = 'Done';
            return;
        } else if(status.assigned == 1 && !self.pullAssigned){
            attachment.status = 'Assigned';
            return;
        }

        $fileDownload = new FileDownload(attachment, $q, $scope, $timeout, coursesService, self.messages);
        attachment.status = 'Downloading';
        coursesService.setAttachmentAssigned(attachment.id);
        try {
            await $fileDownload.startDownload(url, path, fileName);
            coursesService.setAttachmentDownloaded(attachment.id, path+fileName);
            attachment.status = 'Done';
            self.attachmentsDownloaded ++;
            self.sizeDownloaded += attachment.size;
        } catch(ex){
            attachment.status = 'Failed';
        }



        /*for(let i = 0; i < self.course.project.attachments.length; i++){
            if(self.halted){
                break;
            }

            let attachment = self.course.project.attachments[i];

            let path = self.course.relativePath;
            let fileName = attachment.sanitizedName;
            let url = encodeURI(attachment.link);

            let statusResult = await coursesService.getAttachmentActivity(attachment.id);
            let status = statusResult.data.data;
            if(status.downloaded == 1){
                attachment.status = 'Done';
                continue;
            } else if(status.assigned == 1 && !self.pullAssigned){
                attachment.status = 'Assigned';
                continue;
            }

            $fileDownload = new FileDownload(attachment, $q, $scope, $timeout, coursesService, self.messages);
            attachment.status = 'Downloading';
            coursesService.setAttachmentAssigned(attachment.id);
            try {
                await $fileDownload.startDownload(url, path, fileName);
                coursesService.setAttachmentDownloaded(attachment.id, path+fileName);
                attachment.status = 'Done';
                self.attachmentsDownloaded ++;
                self.sizeDownloaded += attachment.size;
            } catch(ex){
                attachment.status = 'Failed';
                continue;
            }

        }   */     
    }

    function reset(){
        self.courseId = null;
        self.course = null;
        self.hasCourseDetails = false;
    }

    function updateTime(){
        if(!self.halted){
            let now = new Date().getTime();
            self.timeElapsed += now - self.lastTimeTick;
            self.lastTimeTick = now;
            $timeout(updateTime, 1000);
        }
    }

    async function unassignEpisode(id){
        await coursesService.setEpisodeUnassigned(id);
    }

    async function unassignAttachment(id){
        await coursesService.setAttachmentUnassigned(id);
    }

    /* Details Getting */
    function getSingleCourseDetails(){
        coursesService.getCourseDetails(self.courseId).then(handleDetailsSuccess, handleFailure);
    }

    /* Details Getting for multi-courses */
    function getCourseDetails(id){
        return coursesService.getCourseDetails(id);
    }

    function handleDetailsSuccess(results){
        self.course = results.data.data;
        self.hasCourseDetails = true;
    }

    function handleFailure(results){
        self.messages.add('error', 'detailgeterror', results.data.message, 5000);
    }


})

.service('coursesService', function($http){
    let self = this;
    self.base = '../../';

    self.getNext = getNext;
    self.getCourseDetails = getCourseDetails;
    self.downloadEpisode = downloadEpisode;
    self.getProgress = getProgress;
    self.getEpisodeActivity = getEpisodeActivity;
    self.getAttachmentActivity = getAttachmentActivity;

    self.setCourseDownloaded = setCourseDownloaded;
    self.setEpisodeAssigned = setEpisodeAssigned;
    self.setAttachmentAssigned = setAttachmentAssigned;
    self.setEpisodeUnassigned = setEpisodeUnassigned;
    self.setAttachmentUnassigned = setAttachmentUnassigned;

    self.setEpisodeDownloaded = setEpisodeDownloaded;
    self.setAttachmentDownloaded = setAttachmentDownloaded;

    function getNext(){
        return $http.get(`${self.base}api/courses/next`);
    }

    function getCourseDetails(id){
        return $http.get(`${self.base}api/course/${id}/details`);
    }

    function downloadEpisode(path, filename, url){
        return $http.post('download.php', {path: path, filename: filename, url:url})
    }

    function getProgress(id){
        return $http.get(`${self.base}api/downloads/${id}/progress`);
    }

    function getEpisodeActivity(id){
        return $http.get(`${self.base}api/episode/${id}/active`)
    }

    function getAttachmentActivity(id){
        return $http.get(`${self.base}api/attachment/${id}/active`)
    }  

    function setCourseDownloaded(id){
        return $http.post(`${self.base}api/course/${id}/downloaded`);
    }

    function setEpisodeUnassigned(id){
        return $http.post(`${self.base}api/episode/${id}/unassign`);
    }

    function setAttachmentUnassigned(id){
        return $http.post(`${self.base}api/attachment/${id}/unassign`);
    }

    function setEpisodeAssigned(id){
        return $http.post(`${self.base}api/episode/${id}/assigned`);
    }

    function setAttachmentAssigned(id){
        return $http.post(`${self.base}api/attachment/${id}/assigned`);
    }

    function setEpisodeDownloaded(id, path){
        return $http.post(`${self.base}api/episode/${id}/downloaded`, {path: path});
    }

    function setAttachmentDownloaded(id, path){
        return $http.post(`${self.base}api/attachment/${id}/downloaded`, {path: path});
    }    
})


.filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
        if(bytes == 0) return '0 Bytes';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
})

.filter('duration', function() {
    //Returns duration from milliseconds in hh:mm:ss format.
      return function(millseconds) {
        var seconds = Math.floor(millseconds / 1000);
        var h = 3600;
        var m = 60;
        var hours = Math.floor(seconds/h);
        var minutes = Math.floor( (seconds % h)/m );
        var scnds = Math.floor( (seconds % m) );
        var timeString = '';
        if(scnds < 10) scnds = "0"+scnds;
        if(hours < 10) hours = "0"+hours;
        if(minutes < 10) minutes = "0"+minutes;
        timeString = hours +":"+ minutes +":"+scnds;
        return timeString;
    }
});
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

                if(self.course.project.hasAttachments){
                    await downloadAttachments();
                }
                await downloadEpisodes();
                await coursesService.setCourseDownloaded(self.course.id);

                self.coursesDownloaded ++;
            }
        } else if(self.pullSingleClass){
            if(self.course.project.hasAttachments){
                await downloadAttachments();
            }
            await downloadEpisodes();
            await coursesService.setCourseDownloaded(self.course.id);
        }

        self.downloading = false;
    }

    async function downloadEpisodes(){
        for(let i = 0; i < self.course.episodes.length; i++){
            if(self.halted){
                break;
            }

            let episode = self.course.episodes[i];

            let path = self.course.relativePath;
            let fileName = episode.fileName;
            let url = episode.videoUrl;

            let statusResult = await coursesService.getEpisodeActivity(episode.episodeId);
            let status = statusResult.data.data;
            if(status.downloaded == 1){
                episode.status = 'Done';
                continue;
            } else if(status.assigned == 1){
                episode.status = 'Assigned';
                continue;
            }

            $fileDownload = new FileDownload(episode, $q, $scope, $timeout, coursesService, self.messages);
            episode.status = 'Downloading';
            coursesService.setEpisodeAssigned(episode.episodeId);
            await $fileDownload.startDownload(url, path, fileName);
            coursesService.setEpisodeDownloaded(episode.episodeId, path+fileName);
            episode.status = 'Done';
            self.episodesDownloaded ++;
            self.sizeDownloaded += episode.size;
        }        
    }

    async function downloadAttachments(){
        for(let i = 0; i < self.course.project.attachments.length; i++){
            if(self.halted){
                break;
            }

            let attachment = self.course.project.attachments[i];

            let path = self.course.relativePath;
            let fileName = attachment.title;
            let url = attachment.link;

            let statusResult = await coursesService.getAttachmentActivity(attachment.id);
            let status = statusResult.data.data;
            if(status.downloaded == 1){
                attachment.status = 'Done';
                continue;
            } else if(status.assigned == 1){
                attachment.status = 'Assigned';
                continue;
            }

            $fileDownload = new FileDownload(attachment, $q, $scope, $timeout, coursesService, self.messages);
            attachment.status = 'Downloading';
            coursesService.setAttachmentAssigned(attachment.id);
            await $fileDownload.startDownload(url, path, fileName);
            coursesService.setAttachmentDownloaded(attachment.id, path+fileName);
            attachment.status = 'Done';
            self.attachmentsDownloaded ++;
            self.sizeDownloaded += attachment.size;
        }        
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
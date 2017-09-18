angular.module('app', [])

.controller('appController', function($scope, $timeout, $q, coursesService){
    let self = this;
    
    self.messages = new MessageManager($timeout);
    self.hasCourseDetails = false; //Used to show/hide ui stuff
    self.downloading = false;


    self.courseId; //Input course Id
    self.course; //Course details

    self.getDetails = getDetails;
    self.reset = reset;
    self.startDownload = startDownload;

    async function startDownload(){
        self.downloading = true;

        if(self.course.project.hasAttachments){
            await downloadAttachments();
        }
        await downloadEpisodes();
        await coursesService.setCourseDownloaded(self.course.id);

        self.downloading = false;
    }

    async function downloadEpisodes(){
        for(let i = 0; i < self.course.episodes.length; i++){
            let episode = self.course.episodes[i];

            let path = self.course.relativePath;
            let fileName = episode.fileName;
            let url = episode.videoUrl;

            let downloadedStatus = await coursesService.getEpisodeDownloaded(episode.episodeId);
            if(downloadedStatus.data.data == 1){
                episode.status = 'Done';
                continue;
            }            

            $fileDownload = new FileDownload(episode, $q, $scope, $timeout, coursesService, self.messages);
            episode.status = 'Downloading';
            await $fileDownload.startDownload(url, path, fileName);
            coursesService.setEpisodeDownloaded(episode.episodeId, path+fileName);
            episode.status = 'Done';
        }        
    }

    async function downloadAttachments(){
        for(let i = 0; i < self.course.project.attachments.length; i++){
            let attachment = self.course.project.attachments[i];

            let path = self.course.relativePath;
            let fileName = attachment.title;
            let url = attachment.link;

            let downloadedStatus = await coursesService.getAttachmentDownloaded(attachment.id);
            if(downloadedStatus.data.data == 1){
                attachment.status = 'Done';
                continue;
            }

            $fileDownload = new FileDownload(attachment, $q, $scope, $timeout, coursesService, self.messages);
            attachment.status = 'Downloading';
            await $fileDownload.startDownload(url, path, fileName);
            coursesService.setAttachmentDownloaded(attachment.id, path+fileName);
            attachment.status = 'Done';
        }        
    }

    function reset(){
        self.courseId = null;
        self.course = null;
        self.hasCourseDetails = false;
    }


    /* Details Getting */
    function getDetails(){
        coursesService.getCourseDetails(self.courseId).then(handleDetailsSuccess, handleFailure);
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

    self.getCourseDetails = getCourseDetails;
    self.downloadEpisode = downloadEpisode;
    self.getProgress = getProgress;
    self.getEpisodeDownloaded = getEpisodeDownloaded;
    self.getAttachmentDownloaded = getAttachmentDownloaded;

    self.setCourseDownloaded = setCourseDownloaded;
    self.setEpisodeAssigned = setEpisodeAssigned;
    self.setAttachmentAssigned = setAttachmentAssigned;
    self.setEpisodeDownloaded = setEpisodeDownloaded;
    self.setAttachmentDownloaded = setAttachmentDownloaded;

    function getCourseDetails(id){
        return $http.get(`${self.base}api/course/${id}/details`);
    }

    function downloadEpisode(path, filename, url){
        return $http.post('download.php', {path: path, filename: filename, url:url})
    }

    function getProgress(id){
        return $http.get(`${self.base}api/downloads/${id}/progress`);
    }

    function getEpisodeDownloaded(id){
        return $http.get(`${self.base}api/episode/${id}/downloaded`)
    }

    function getAttachmentDownloaded(id){
        return $http.get(`${self.base}api/attachment/${id}/downloaded`)
    }  

    function setCourseDownloaded(id){
        return $http.post(`${self.base}api/course/${id}/downloaded`);
    }

    function setEpisodeAssigned(id){
        return $http.post(`${self.base}api/episode/${id}/assigned`, {path: path})
    }

    function setAttachmentAssigned(id){
        return $http.post(`${self.base}api/attachment/${id}/assigned`, {path: path})
    }  

    function setEpisodeDownloaded(id, path){
        return $http.post(`${self.base}api/episode/${id}/downloaded`, {path: path})
    }

    function setAttachmentDownloaded(id, path){
        return $http.post(`${self.base}api/attachment/${id}/downloaded`, {path: path})
    }    
})


.filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});
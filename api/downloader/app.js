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
        let path = self.course.relativePath;
        let fileName = self.course.episodes[0].fileName;
        let url = self.course.episodes[0].videoUrl;

        $fileDownload = new FileDownload(self.course.episodes[0], $q, $scope, $timeout, coursesService, self.messages);
        await $fileDownload.startDownload(url, path, fileName);
        console.log('holy shit done');
        /*for(let i = 0; i < self.course.episodes.length; i++){
            let episode = self.course.episodes[i];
        }*/
        //coursesService.downloadEpisode(path, fileName, url).then(handleSuccess, handleFailure);
    }

    function handleDownloadInitSuccess(result){
        monitorDownloadProgress(result.progressId);
    }

    function startMonitorDownloadProgress(id){
        $timeout()
    }

    function progressMonitorHandler(totalSize, downloaded){
        if(totalSize == downloaded){
            console.log('done');
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

    function getCourseDetails(id){
        return $http.get(`${self.base}api/course/${id}/details`);
    }

    function downloadEpisode(path, filename, url){
        return $http.post('download.php', {path: path, filename: filename, url:url})
    }

    function getProgress(id){
        return $http.get(`${self.base}api//downloads/${id}/progress`);
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
// ==UserScript==
// @name         Skillshare 2
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        *.skillshare.com/*
// @require       https://cdn.jsdelivr.net/jquery/2.1.3/jquery.min.js
// @require       https://cdn.rawgit.com/kriskowal/q/master/q.js
// @grant        none
// ==/UserScript==

/*
    Example episode data:
    {
        numner:
        createdAt:
        title:
        videoId:
        thumbnails:
        source: {
            url:
            height:
            width:
            duration:
            size:
            avgBitrate:
        }

    }
 */
(function(){

    let dataGetter = null;

    function init(){
        dataGetter = new DataGetterModule();
        dataGetter.getData().then(function(){
            console.log("=============================== Data Pulled ==================================");
            console.log(dataGetter.data);
            let dataToSend = {
                data: dataGetter.data
            };
            $.ajax({
                url: `https://192.168.2.4/skillshare/api/course/${dataGetter.data.sku}/data`,
                type: 'POST',
                dataType: "xml/html/script/json",
                contentType: "application/json",
                crossOrigin: true,
                data: JSON.stringify(dataGetter.data)
            });
            //$.post(`https://192.168.2.4/skillshare/api/course/${dataGetter.data.sku}/data`, dataToSend);
        })
    }

    init();

    function DataGetterModule(){
        let self = this;
        let data = {
            sku: NaN,
            author: {
                name: null,
                url: null
            },
            description: null,
            students: 0,
            reviews: {
                total: 0,
                positive: 0
            },
            project: {
                projectGuide: null,
                hasAttachments: false,
                attachments: []
            },
            tags: [],
            episodes: []
        };

        self.getData = getData;
        self.data = data;



        function getCourseEpisodes(){
            let deferred = Q.defer();

            let sourceList = SS.serverBootstrap.pageData.unitsData.units[0].sessions;
            let accountId = getBrightcoveAccountId();
            for(let i = 0; i < sourceList.length; i++){
                let videoId = sourceList[i].videoId.substring(sourceList[i].videoId.indexOf(":") + 1, sourceList[i].videoId.length);
                $.ajax({
                    url: `https://edge.api.brightcove.com/playback/v1/accounts/${accountId}/videos/${videoId}`,
                    type: 'GET',
                    headers: {
                        Accept: `application/json;pk=${getPolicyKey()}`
                    }
                }).then(
                    (result) => {
                        let source = getPreferredVideoSource(result.sources);
                        let episode = {
                            episodeId: sourceList[i].id,
                            number: sourceList[i].displayRank,
                            createdAt: result.created_at,
                            title: sourceList[i].title,
                            videoId: videoId,
                            thumbnails:sourceList[i].thumbnails,
                            source: {
                                url: source.src,
                                height: source.height,
                                width: source.width,
                                duration: source.duration,
                                size: source.size,
                                avgBitrate: source.avg_bitrate
                            }
                        }
                        data.episodes.push(episode);
                        if(i == sourceList.length - 1){
                            deferred.resolve();
                        }
                    }
                )
            }
            return deferred.promise;
        }

        //Used by getCourseEpisodes()
        function getPreferredVideoSource(sources){
            for(let i = 0; i < sources.length; i++){
                if(typeof sources[i].src != 'undefined'){
                    if(sources[i].src.includes('udso-a.akamaihd.net')){
                        return sources[i];
                    }
                }
            }
        }

        function getProjectGuide(){
            let deferred = Q.defer();

            let sku = getClassSku();
            $.ajax({
                url:`https://www.skillshare.com/classes/Intro-to-Mobile-App-Design-with-Sketch-3/${sku}/project-guide`,
                type: 'GET',
                headers: { Accept: "application/json, text/javascript, */*; q=0.01" }
            }).then(
                (result) => {
                    let project = {
                        projectGuide: result.project_guide,
                        hasAttachments: result.hasAttachments,
                        attachments: []
                    }
                    if(result.hasAttachments == true || result.hasAttachments == 'true'){
                        for(let i = 0; i < result.attachments.length; i++){
                            project.attachments.push({
                                url: result.attachments[i].url,
                                title: result.attachments[i].title,
                                size: parseSizeString(result.attachments[i].size),
                                sizeString: result.attachments[i].size
                            })
                        }
                    }
                    data.project = project;
                    deferred.resolve();
                }
            );

            return deferred.promise;
        }

        function parseSizeString(sizeString){
            if(sizeString.includes("KB")){
                return parseInt(sizeString) * 1000;
            } else if(sizeString.includes("MB")){
                return parseInt(sizeString) * 1000 * 1000;
            } else if(sizeString.includes("GB")){
                return parseInt(sizeString) * 1000 * 1000 * 1000;
            }
            return 0;
        }

        function getTags(tagsList){
            let deferred = Q.defer();
            if(!isEmpty(tagsList)){
                for(let i = 0; i < tagsList.length; i++){
                    $.get(`https://www.skillshare.com/tags/renderPopover?tagSlug=${tagsList[i].slug}`).then(
                        (results) => {
                            results = JSON.parse(results); //For some reason it's not already parsed'
                            let tag = {
                                name: tagsList[i].name,
                                slug: tagsList[i].slug,
                            };
                            if(results.success == 1){
                                tag.numClasses = Number(results.templateData.numClasses.replace(/,/g, ''));
                                tag.numFollowers = Number(results.templateData.numFollowers.replace(/,/g, ''));
                            }
                            data.tags.push(tag);
                            if(i == tagsList.length - 1){
                                deferred.resolve();
                            }
                        }
                    );
                }
            } else {
                deferred.resolve();
            }
            return deferred.promise;
        }

        function getClassInfo(){
            let deferred = Q.defer();

            let sku = getClassSku();
            $.ajax({
                url:`https://www.skillshare.com/classes/Intro-to-Mobile-App-Design-with-Sketch-3/${sku}`,
                type: 'GET',
                headers: { Accept: "application/json, text/javascript, */*; q=0.01" }
            }).then(
                (result) => {
                    data.description = result.description;
                    getAuthor(result.teacherInfo);
                    getStudentsCount(result.numStudents);
                    getReviewCounts(result.numReviews, result.numRecommendations);

                    getTags(result.tags).then(function(){
                        deferred.resolve();
                    });
                }
            );
            return deferred.promise;
        }

        function getReviewCounts(reviews, recommendations){
            if(Number(reviews.replace(/,/g, '')) != NaN){
                data.reviews.total = Number(reviews.replace(/,/g, ''));
            }
            if(Number(recommendations.replace(/,/g, '')) != NaN){
                data.reviews.positive = Number(recommendations.replace(/,/g, ''));
            }

            //Old method
            /*let sku = getClassSku();
            $.get(`https://www.skillshare.com/reviews/index?sku=${sku}&page=1`).then(
                (result) => {
                    data.reviews.total = result.numReviews;
                    data.reviews.positive = result.numRecommendations;
                }
            );*/
        }



        function getStudentsCount(numStudents){
            if(Number(numStudents.replace(/,/g, '')) != NaN){
                data.students = Number(numStudents.replace(/,/g, ''));
            }
        }

        function getAuthor(teacherInfo){
            data.author = {
                name: teacherInfo.fullName,
                id: teacherInfo.teacherUid,
                url: teacherInfo.profileUrl
            }
        }

        /* General Data Getters */
        function getClassSku(){
            return SS.serverBootstrap.classData.parentClass.sku;
        }

        /*function getClassDescription(){
            let element = $('.about-this-class .description-column');
            return element.html()
        }*/

        function getBrightcoveAccountId(){
            return SS.serverBootstrap.pageData.videoPlayerData.brightcoveAccountId;
        }

        function getPolicyKey(){
            return "BCpkADawqM2OOcM6njnM7hf9EaK6lIFlqiXB0iWjqGWUQjU7R8965xUvIQNqdQbnDTLz0IAO7E6Ir2rIbXJtFdzrGtitoee0n1XXRliD-RH9A-svuvNW9qgo3Bh34HEZjXjG4Nml4iyz3KqF";
        }

        function getData(){
            data.sku = getClassSku();
            return getClassInfo().then(function(){
                return getProjectGuide();
            })
            .then(function(){
                return getCourseEpisodes();
            });
        }
    }


})();

function isEmpty(value){
  if(typeof(value) == 'object'){
    if(Object.keys(value).length == 0){
      return true;
    } else {
      return false;
    }
  }

  if(typeof(value) !== 'undefined' && value !== null && value.length != 0){
    return false;
  }

  return true;
}
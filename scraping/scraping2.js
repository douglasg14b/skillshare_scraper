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
    let manualMode = true;

    let dataGetter = null;
    let serverComms = null;

    let contaier = null;
    let statusBox = null;
    let toggleModeButton = null;

    function init(){
        serverComms = new ServerCommunicationModule();
        dataGetter = new CourseDataGetterModule();
        addContainer();
        addNextButton();
        addStatusBox();
        addToggleModeButton();

        dataGetter.getData().then(
            () => {
                serverComms.sendData(dataGetter.data).then(handleSendSuccess, handleSendFailure);
            },
            (message) => {
                if(message = 'locked'){
                    serverComms.markLocked(dataGetter.data.sku).then(handleSendSuccess, handleSendFailure);
                }
            }
        );
    }

    //Main loop
    /*function go(){
        serverComms.moveNext().then(() => {
                dataGetter = new CourseDataGetterModule();
                setStatus('pulling');
                dataGetter.getData().then(() => {
                    serverComms.sendData.then(handleSendSuccess, handleSendFailure);
                })
            }
        )
    }*/

    function handleSendSuccess(result){
        setStatus('pulled');
        if(!manualMode){
            serverComms.moveNext();
        }
    }

    function handleSendFailure(result){
        if(result.status == 409){
            setStatus('duplicate');
            if(!manualMode){
                serverComms.moveNext();
            }
        } else {
            setStatus('failure');
            console.log(result);
        }
    }

    function setStatus(status){
        switch(status){
            case 'waiting':
                statusBox.css('background','#deb930');
                statusBox.text('Waiting');
                break;
            case 'pulling':
                statusBox.css('background', '#30d6de');
                statusBox.text('Waiting');
                break;
            case 'pulled':
                statusBox.css('background', '#29bf2e');
                statusBox.text('Pulled & Sent');
                break;
            case 'failure':
                statusBox.css('background', '#de3030');
                statusBox.text('Failure');
                break;
            case 'duplicate':
                statusBox.css('background', '#de3030');
                statusBox.text('Already Exists');
                break;
        }
    }

    function toggleMode(){
        manualMode = !manualMode;
        if(manualMode){
            toggleModeButton.text('Set Automatic Mode');
        } else {
            toggleModeButton.text('Set Manual Mode');
        }
    }

    function addContainer(){
        container = $('<div></div>');
        container.css({
            'top': '40vh',
            'right':10,
            'position': 'fixed',
            'z-index': 9999,
            'text-align': 'center'
        });
        $('body').append(container);
    }

    function addNextButton(){
        let button = $('<div><button>Next Page</button></div>');
        button.css({
            'padding': '0.4em'
        });
        container.append(button);
        button.on('click', serverComms.moveNext);
    }

    function addToggleModeButton(){
        toggleModeButton = $('<button></button>');
        toggleModeButton.css({
            'padding': '0.4em',
            'display': 'block'
        });
        if(manualMode){
            toggleModeButton.text('Set Automatic Mode');
        } else {
            toggleModeButton.text('Set Manual Mode');
        }
        container.append(toggleModeButton);
        toggleModeButton.on('click', toggleMode);
    }

    function addStatusBox(){
        statusBox = $('<div></div>');
        statusBox.css({
            'background': 'yellow'
        });
        statusBox.text('Waiting');
        container.append(statusBox);
    }

    init();

    function ServerCommunicationModule(){
        let self = this;

        //Fields API
        self.canContinue = false;

        //Methods API
        self.getNext = getNext;
        self.moveNext = moveNext;
        self.sendData = sendData;
        self.markLocked = markLocked;


        function moveNext(){
            getNext().then(
                (result) => {
                    goToPage(result.data.link);
                },
                (result) => {
                    setStatus('failure');
                }
            );
        }

        function getNext(){
            return $.get('https://192.168.2.4/skillshare/api/next');
        }

        function markLocked(id){
            return $.post(`https://192.168.2.4/skillshare/api/course/${id}/locked`);
        }

        function sendData(data){
            let deferred = Q.defer();

            $.ajax({
                url: `https://192.168.2.4/skillshare/api/course/${data.sku}/data`,
                type: 'POST',
                contentType: "application/json",
                crossOrigin: true,
                data: JSON.stringify(data)
            }).done(function(result){
                deferred.resolve();
            }).fail(function(result, error){
                console.log(error);
                deferred.reject(result);
            });

            return deferred.promise;
        }

        //Private functions

        function goToPage(url){
            window.location.href = url;
        }


    }

    function CourseDataGetterModule(){
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

            let numCompleted = 0;
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
                        let episode = {
                            episodeId: sourceList[i].id,
                            number: sourceList[i].displayRank,
                            createdAt: result.created_at,
                            title: sourceList[i].title,
                            videoId: videoId
                        };
                        let sourceIndex = getPreferredVideoSourceIndex(result.sources);
                        if(sourceIndex >= 0){
                            episode.source = {
                                url: result.sources[sourceIndex].src,
                                height: result.sources[sourceIndex].height,
                                width: result.sources[sourceIndex].width,
                                duration: result.sources[sourceIndex].duration,
                                size: result.sources[sourceIndex].size,
                                avgBitrate: result.sources[sourceIndex].avg_bitrate
                            };
                            episode.hasSource = true;
                        } else {
                            episode.hasSource = false;
                        }

                        if(!isEmpty(sourceList[i].thumbnails)){
                            episode.thumbnails = JSON.parse(JSON.stringify(sourceList[i].thumbnails));
                        } else {
                            episode.thumbnails = { original: result.thumbnail };
                        }

                        data.episodes.push(episode);
                        numCompleted++;
                        if(numCompleted == sourceList.length - 1){
                            deferred.resolve();
                        }
                    },
                    (result) => {
                        if(result.responseJSON[0].error_code == "VIDEO_NOT_PLAYABLE"){
                            let episode = {
                                episodeId: sourceList[i].id,
                                number: sourceList[i].displayRank,
                                title: sourceList[i].title,
                                videoId: videoId,
                                hasSource: false
                            };

                            data.episodes.push(episode);
                            numCompleted++;
                            if(numCompleted == sourceList.length - 1){
                                deferred.resolve();
                            }
                        } else {
                            numCompleted++;
                            console.log(result);
                            throw "Unexpected Error Occured";
                        }
                    }
                );
            }
            return deferred.promise;
        }

        //Used by getCourseEpisodes()
        function getPreferredVideoSourceIndex(sources){

            let alternateSrc = [];
            //Find preferred
            for(let i = 0; i < sources.length; i++){
                if(typeof sources[i].src != 'undefined'){
                    if(sources[i].src.includes('udso-a.akamaihd.net')){
                        return i;
                    } else if(sources[i].src.includes('uds.ak.o.brightcove.com')){
                        alternateSrc.push(i);
                    }
                }
            }
            
            if(alternateSrc.length > 0){
                return alternateSrc[0];
            }

            return -1;
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
                    };
                    if(result.hasAttachments == true || result.hasAttachments == 'true'){
                        for(let i = 0; i < result.attachments.length; i++){
                            project.attachments.push({
                                url: result.attachments[i].url,
                                title: result.attachments[i].title,
                                size: parseSizeString(result.attachments[i].size),
                                sizeString: result.attachments[i].size
                            });
                        }
                    }
                    data.project = project;
                    deferred.resolve();
                }
            );

            return deferred.promise;
        }

        function parseSizeString(sizeString){
            if(isEmpty(sizeString)){
                return 0;
            }
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

        function isClassLocked(){
            return SS.serverBootstrap.pageData.unitsData.isLocked;
        }

        function getData(){
            data.sku = getClassSku(); //First so it's available

            if(isClassLocked()){
                let deferred = Q.defer();
                deferred.reject("Locked");
                return deferred.promise;
            }

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
    if(value === null){
        return true;
    }
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
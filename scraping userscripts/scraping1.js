// ==UserScript==
// @name         Skillshare 1
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        *.skillshare.com/*
// @require       https://cdn.jsdelivr.net/jquery/2.1.3/jquery.min.js
// @grant        none
// ==/UserScript==

(function(){

    var address= "localhost";
    let container;
    let scrollModule;
    let dataCollectorModule

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

    function init(){
        addContainer();

        scrollModule = new ScrollModule(container);
        dataCollectorModule = new DataCollectorModule(container);
    }

    init();
    /* Modules */

    function DataCollectorModule(container){
        let self = this;

        self.button;
        self.stats;

        self.coursesFound = 0;
        self.coursesSent = 0;
        self.coursesNotSent = 0;
        self.responses = 0; //The # of responses to the sending
        self.coursesData = [];

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function collectData(){
                self.coursesData.length = 0;
                self.coursesFound = 0;
                self.coursesSent = 0;
                self.coursesNotSent = 0;
                self.responses = 0;

            $('.col-4 .title-link a').each(function(index){
                self.coursesFound++;
                updateStats();

                let output = {
                    name: $(this).text(),
                    link: "",
                    courseId: NaN
                };
                output.name = $(this).text();
                let rawLink = $(this).attr('href');
                let linkAndId = parseLinkAndId(rawLink);
                output.link = linkAndId.link;
                output.courseId = linkAndId.id;
                self.coursesData.push(output)
            })
            sendCourses(0);
        }

        async function sendCourses(index){
            if(index < self.coursesData.length){
                let chunk = 5;
                for(let i = 0; i < chunk; i++){
                    if(i+index < self.coursesData.length){
                        $.post("https://"+address+"/skillshare/api/course/new", self.coursesData[i+index]).then(
                            () => {
                                self.coursesSent ++;
                                self.responses ++;
                                updateStats();
                                checkMarkComplete();
                            },
                            (response) => {
                                console.log(response.responseJSON.message);
                                self.coursesNotSent ++;
                                self.responses ++;
                                updateStats();
                                checkMarkComplete();
                            }
                        );
                    } else {
                        break;
                    }
                }
                updateStats();
                checkMarkComplete();
                await sleep(250);
                sendCourses(index + chunk);
            }
        }

        function parseLinkAndId(text){
            let output = {
                link: '',
                id: NaN
            };
            let end = text.indexOf("?");
            output.link = text.substring(0, end);
            for(let i = text.length; i > 0; i-- ){
                if(text[i] == "/"){
                    output.id = text.substring(i + 1, end);
                    break;
                }
            }
            return output;
        }

        function checkMarkComplete(){
            if(self.coursesFound == self.responses){
                self.stats.css({color: "green"});
                self.coursesData.length = 0;
                self.coursesFound = 0;
                self.coursesSent = 0;
                self.coursesNotSent = 0;
                self.responses = 0;

            } else {
                self.stats.css({color: "black"});
            }
        }

        function updateStats(){
            self.stats.html(`${self.coursesSent}/${self.coursesFound} Added. ${self.coursesNotSent} Not Added <br> ${self.responses}/${self.coursesFound} Handled`);
            //self.stats.text(`Found ${self.coursesFound} courses sent ${self.coursesSent}`);
        }

        function addStats(){
            let stats = $('<div style="background:white;"></div>');
            container.append(stats);
            self.stats = stats;
        }

        function addCollectButton(){
            let button = $('<div><button>Collect Data</button></div>');
            button.css({
                'padding': '0.4em'
            });
            container.append(button);
            button.on('click', collectData);
            self.button = button;
        }

        function init(){
            addCollectButton();
            addStats();
        }

        init();
    }

    function ScrollModule(container){
        let self = this;

        self.scrollButton;
        self.scrolling = false;

        self.init = init;



        function startScroll(){
            self.scrolling = true;
            self.scrollButton.text('Stop..');
            self.scrollButton.one('click', stopScroll);
            scrollPage();
        }

        function stopScroll(){
            self.scrolling = false;
            self.scrollButton.text('Scroll');
            self.scrollButton.one('click', startScroll);
        }

        function scrollPage(){
            if(self.scrolling){
                window.scrollBy(0,20);
                setTimeout(scrollPage,10);
            }
        }

        function addScrollButton(){
            let innerContainer = $('<div></div>');
            let scrollButton = $('<button>Scroll</button>');
            scrollButton.css({
                'padding': '0.4em'
            });
            innerContainer.append(scrollButton);
            container.append(innerContainer);
            scrollButton.one('click', startScroll);
            self.scrollButton = scrollButton;
        }

        function init(){
            addScrollButton();
        }

        init();
    }
})();
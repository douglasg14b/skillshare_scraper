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
        self.coursesData = [];

        function collectData(){
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

        function sendCourses(index){
            if(index < self.coursesData.length){
                let chunk = 5;
                for(let i = 0; i < chunk; i++){
                    if(i+index < self.coursesData.length){
                        $.post("https://192.168.2.4/skillshare/api/course/new", self.coursesData[i+index]).then(
                            () => {
                                self.coursesSent ++;
                                updateStats();
                            },
                            (response) => {
                                console.log(response.responseJSON.message);
                            }
                        );
                    } else {
                        break;
                    }
                }
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

        function updateStats(){
            self.stats.text(`Found ${self.coursesFound} courses sent ${self.coursesSent}`);
        }

        function addStats(){
            let stats = $('<div></div>');
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
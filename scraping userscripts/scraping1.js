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

  let template = `<div class="scraper-head">
    <div class="status">
      <b>Status:</b>
      <span>Running...</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Found</th>
          <th>Added</th>
          <th>Ignored</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="found">100</td>
          <td class="added">100</td>
          <td class="ignored">100</td>
        </tr>
      </tbody>
    </table>
    <div class="buttons">
      <button class="start-toggle">Start</button>
      <button class="scroll-toggle">Stop Scrolling</button>
    </div>
  </div>
  <style>
    .scraper-head {
      width: 250px;
    }

    .scraper-head > table {
        width: 250px;
    }

    .scraper-head td, .scraper-head th {
      border: 1px solid #999;
      padding: 0.5rem;
    }

    .scraper-head table {
      border-collapse: collapse;
    }

    .scraper-head .start-toggle {
      float: left;
    }

    .scraper-head .scroll-toggle {
      float: right;
    }

    .scraper-head .buttons {
      padding-top:5px;
    }

    .scraper-head .status {
      padding-bottom: 10px;
      text-align: center;
    }
  </style>`

    function addContainer(){
        container = $('<div></div>');
        container.css({
            'top': '40vh',
            'right':10,
            'position': 'fixed',
            'z-index': 9999,
            'text-align': 'center',
            'background': 'white',
            'padding': '5px',
            'border': 'solid 3px black'
        });
        $('body').append(container);
    }

    function init(){
        addContainer();

        //scrollModule = new ScrollModule(container);
        //dataCollectorModule = new DataCollectorModule(container);

        ScrapingManager = new ScrapingManager(container, scrollModule, dataCollectorModule);
    }

    init();


    /* Modules */

    function ScrapingManager(container){
        let self = this;

        //Object of jquery objects and values for the interface
        self.interface = {
            self: this,
            data: {
                totalFound : 0,
                totalAdded : 0,
                totalIgnored: 0
            },
            $status: null,
            $totalFound: null,
            $totalAdded: null,
            $totalIgnored: null,
            $startToggle: null,
            $scrollToggle: null,

            set totalFound(value){
                self.data.totalFound = value;
                self.$totalFound.text(value);
            },

            set totalAdded(value){
                self.data.totalAdded = value;
                self.$totalAdded.text(value);
            },

            set totalIgnored(value){
                self.data.totalIgnored = value;
                self.$totalIgnored.text(value);
            }
        };

        self.orderTypes = ['recently-added', 'rating']
        self.categories = [];

        self.scrollCount = 0;

        self.scrollModule;
        self.dataCollectorModule;

        function start(){
            self.categories = getCategories();
            self.scrollModule.startScroll(() => { scrollComplete()})
        }

        function scrollComplete(){
            scrollCount++;
            if(self.dataCollectorModule.getCourseCount() != 300 && scrollCount < 2){
                console.log("Retry Scroll");
                self.scrollModule.startScroll(() => { scrollComplete()})
            } else {
                console.log("Scroll Complete");
                console.log(self.dataCollectorModule.getCourseCount());

                self.DataCollectorModule.collectData(() => { dataCollectionComplete(); })
            }

        }

        function dataCollectionComplete(){
            console.log("Data collection complete");
        }

        function getCategories(){
            let categories = [];
            $('.side-sticky-menu-wrapper .content-body .tag-link-wrapper.primary-tag-link-wrapper').each(function(index){

                let category = {};
                category.text = cleanCategoryName($(this).children('a.tag-link').text());

                category.hasChildren = $(this).children('.related-tags-flyover').length != 0;
                if(category.hasChildren){
                    category.children = [];
                    $(this).children('.related-tags-flyover').find('.tag-link-wrapper a.tag-link').each(function(index){
                        if(index > 0){
                            category.children.push(cleanCategoryName($(this).text()));
                        }
                    })
                }
                categories.push(category);
            });

            return categories;
        }

        //Cleans category names to turn them into the url-friendly tags
        function cleanCategoryName(name, index){
            let clean = name.toLowerCase().replace(' ', '-').replace('/', '-');
            return clean;
        }

        function addStartButton(){
            let button = $('<div><button>Start</button></div>');
            button.css({
                'padding': '0.4em'
            });
            container.append(button);
            button.on('click', start);
            self.button = button;
        }

        function addUi(){
            let element = $(template);
            container.append(element);

            self.interface.$status = element.find('.status span');
            self.interface.$totalFound = element.find('table .found');
            self.interface.$totalAdded = element.find('table .added');
            self.interface.$totalIgnored = element.find('table .ignored');
            self.interface.$startToggle = element.find('.start-toggle');
            self.interface.$scrollToggle = element.find('.scroll-toggle');

            self.interface.$startToggle.on('click', start);

        }

        function init(){
            //addStartButton();
            addUi();
            self.categories = getCategories();
            self.scrollModule = new ScrollModule(self.interface);
            self.dataCollectorModule = new DataCollectorModule(self.interface);
        }

        init();

    }

    function DataCollectorModule(interface){
        let self = this;

        self.interface = interface;

        self.button;
        self.stats;

        self.coursesFound = 0;
        self.coursesSent = 0;
        self.coursesNotSent = 0;
        self.responses = 0; //The # of responses to the sending
        self.coursesData = [];

        self.getCourseCount = getCourseCount;

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function getCourseCount(){
            return $('.col-4 .ss-card__title a').length;
        }

        async function collectData(callback){
                self.coursesData.length = 0;
                self.coursesFound = 0;
                self.coursesSent = 0;
                self.coursesNotSent = 0;
                self.responses = 0;

            $('.col-4 .ss-card__title a').each(function(index){
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
            //console.log(self.coursesData);
            await sendCourses(0);

            callback();
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
                //self.stats.css({color: "green"});
                //self.coursesData.length = 0;
                //self.coursesFound = 0;
                //self.coursesSent = 0;
                //self.coursesNotSent = 0;
                //self.responses = 0;

            } else {
                //self.stats.css({color: "black"});
            }
        }

        function updateStats(){
            self.interface.totalAdded = self.coursesSent;
            self.interface.totalFound = self.coursesFound;
            self.interface.totalIgnored = self.coursesNotSent;


            //self.stats.html(`${self.coursesSent}/${self.coursesFound} Added. ${self.coursesNotSent} Not Added <br> ${self.responses}/${self.coursesFound} Handled`);
            //self.stats.text(`Found ${self.coursesFound} courses sent ${self.coursesSent}`);
        }

        function addStats(){
            //let stats = $('<div style="background:white;"></div>');
            //container.append(stats);
            //self.stats = stats;
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

    function ScrollModule(interface){
        let self = this;

        self.scrollButton = interface.$scrollToggle;
        self.scrolling = false;

        self.scrollTop = 0;
        self.scrollTries = 0;

        self.init = init;

        self.completeCallback;

        //functions
        self.startScroll = startScroll;



        function startScroll(callback){
            self.completeCallback = callback;
            resetScrollState();
            self.scrolling = true;
            self.scrollButton.text('Stop Scroll');
            self.scrollButton.one('click', stopScroll);
            scrollPage();
        }

        function stopScroll(){
            resetScrollState();
            self.scrolling = false;
            self.scrollButton.text('Start Scroll');
            self.scrollButton.one('click', startScroll);

            self.completeCallback();
        }

        function resetScrollState(){
            self.scrollTries = 0;
            self.scrollTop = 0;
        }

        function scrollPage(){
            let scrollTop = $(window).scrollTop();
            let callbackTimeout = 10;

            if(self.scrolling){

                if (self.scrollTop != scrollTop){
                    self.scrollTries = 0;
                } else {
                    self.scrollTries ++;

                    if(self.scrollTries >= 750){
                        stopScroll();
                        return;
                    }
                }

                self.scrollTop = scrollTop;
                window.scrollBy(0,20);
                setTimeout(scrollPage,callbackTimeout);
            }
        }

        /*function addScrollButton(){
            let innerContainer = $('<div></div>');
            let scrollButton = $('<button>Scroll</button>');
            scrollButton.css({
                'padding': '0.4em'
            });
            innerContainer.append(scrollButton);
            container.append(innerContainer);
            scrollButton.one('click', startScroll);
            self.scrollButton = scrollButton;
        }*/

        function init(){
            //addScrollButton();
        }

        init();
    }
})();// ==UserScript==
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

  let template = `<div class="scraper-head">
    <div class="status">
      <b>Status:</b>
      <span>Running...</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Found</th>
          <th>Added</th>
          <th>Ignored</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="found">100</td>
          <td class="added">100</td>
          <td class="ignored">100</td>
        </tr>
      </tbody>
    </table>
    <div class="buttons">
      <button class="start-toggle">Start</button>
      <button class="scroll-toggle">Stop Scrolling</button>
    </div>
  </div>
  <style>
    .scraper-head {
      width: 250px;
    }

    .scraper-head > table {
        width: 250px;
    }

    .scraper-head td, .scraper-head th {
      border: 1px solid #999;
      padding: 0.5rem;
    }

    .scraper-head table {
      border-collapse: collapse;
    }

    .scraper-head .start-toggle {
      float: left;
    }

    .scraper-head .scroll-toggle {
      float: right;
    }

    .scraper-head .buttons {
      padding-top:5px;
    }

    .scraper-head .status {
      padding-bottom: 10px;
      text-align: center;
    }
  </style>`

    function addContainer(){
        container = $('<div></div>');
        container.css({
            'top': '40vh',
            'right':10,
            'position': 'fixed',
            'z-index': 9999,
            'text-align': 'center',
            'background': 'white',
            'padding': '5px',
            'border': 'solid 3px black'
        });
        $('body').append(container);
    }

    function init(){
        addContainer();

        //scrollModule = new ScrollModule(container);
        //dataCollectorModule = new DataCollectorModule(container);

        ScrapingManager = new ScrapingManager(container, scrollModule, dataCollectorModule);
    }

    init();


    /* Modules */

    function ScrapingManager(container){
        let self = this;

        //Object of jquery objects and values for the interface
        self.interface = {
            self: this,
            data: {
                totalFound : 0,
                totalAdded : 0,
                totalIgnored: 0
            },
            $status: null,
            $totalFound: null,
            $totalAdded: null,
            $totalIgnored: null,
            $startToggle: null,
            $scrollToggle: null,

            set totalFound(value){
                self.data.totalFound = value;
                self.$totalFound.text(value);
            },

            set totalAdded(value){
                self.data.totalAdded = value;
                self.$totalAdded.text(value);
            },

            set totalIgnored(value){
                self.data.totalIgnored = value;
                self.$totalIgnored.text(value);
            }
        };

        self.orderTypes = ['recently-added', 'rating']
        self.categories = [];

        self.scrollCount = 0;

        self.scrollModule;
        self.dataCollectorModule;

        function start(){
            self.categories = getCategories();
            self.scrollModule.startScroll(() => { scrollComplete()})
        }

        function scrollComplete(){
            scrollCount++;
            if(self.dataCollectorModule.getCourseCount() != 300 && scrollCount < 2){
                console.log("Retry Scroll");
                self.scrollModule.startScroll(() => { scrollComplete()})
            } else {
                console.log("Scroll Complete");
                console.log(self.dataCollectorModule.getCourseCount());

                self.DataCollectorModule.collectData(() => { dataCollectionComplete(); })
            }

        }

        function dataCollectionComplete(){
            console.log("Data collection complete");
        }

        function getCategories(){
            let categories = [];
            $('.side-sticky-menu-wrapper .content-body .tag-link-wrapper.primary-tag-link-wrapper').each(function(index){

                let category = {};
                category.text = cleanCategoryName($(this).children('a.tag-link').text());

                category.hasChildren = $(this).children('.related-tags-flyover').length != 0;
                if(category.hasChildren){
                    category.children = [];
                    $(this).children('.related-tags-flyover').find('.tag-link-wrapper a.tag-link').each(function(index){
                        if(index > 0){
                            category.children.push(cleanCategoryName($(this).text()));
                        }
                    })
                }
                categories.push(category);
            });

            return categories;
        }

        //Cleans category names to turn them into the url-friendly tags
        function cleanCategoryName(name, index){
            let clean = name.toLowerCase().replace(' ', '-').replace('/', '-');
            return clean;
        }

        function addStartButton(){
            let button = $('<div><button>Start</button></div>');
            button.css({
                'padding': '0.4em'
            });
            container.append(button);
            button.on('click', start);
            self.button = button;
        }

        function addUi(){
            let element = $(template);
            container.append(element);

            self.interface.$status = element.find('.status span');
            self.interface.$totalFound = element.find('table .found');
            self.interface.$totalAdded = element.find('table .added');
            self.interface.$totalIgnored = element.find('table .ignored');
            self.interface.$startToggle = element.find('.start-toggle');
            self.interface.$scrollToggle = element.find('.scroll-toggle');

            self.interface.$startToggle.on('click', start);

        }

        function init(){
            //addStartButton();
            addUi();
            self.categories = getCategories();
            self.scrollModule = new ScrollModule(self.interface);
            self.dataCollectorModule = new DataCollectorModule(self.interface);
        }

        init();

    }

    function DataCollectorModule(interface){
        let self = this;

        self.interface = interface;

        self.button;
        self.stats;

        self.coursesFound = 0;
        self.coursesSent = 0;
        self.coursesNotSent = 0;
        self.responses = 0; //The # of responses to the sending
        self.coursesData = [];

        self.getCourseCount = getCourseCount;

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function getCourseCount(){
            return $('.col-4 .ss-card__title a').length;
        }

        async function collectData(callback){
                self.coursesData.length = 0;
                self.coursesFound = 0;
                self.coursesSent = 0;
                self.coursesNotSent = 0;
                self.responses = 0;

            $('.col-4 .ss-card__title a').each(function(index){
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
            //console.log(self.coursesData);
            await sendCourses(0);

            callback();
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
                //self.stats.css({color: "green"});
                //self.coursesData.length = 0;
                //self.coursesFound = 0;
                //self.coursesSent = 0;
                //self.coursesNotSent = 0;
                //self.responses = 0;

            } else {
                //self.stats.css({color: "black"});
            }
        }

        function updateStats(){
            self.interface.totalAdded = self.coursesSent;
            self.interface.totalFound = self.coursesFound;
            self.interface.totalIgnored = self.coursesNotSent;


            //self.stats.html(`${self.coursesSent}/${self.coursesFound} Added. ${self.coursesNotSent} Not Added <br> ${self.responses}/${self.coursesFound} Handled`);
            //self.stats.text(`Found ${self.coursesFound} courses sent ${self.coursesSent}`);
        }

        function addStats(){
            //let stats = $('<div style="background:white;"></div>');
            //container.append(stats);
            //self.stats = stats;
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

    function ScrollModule(interface){
        let self = this;

        self.scrollButton = interface.$scrollToggle;
        self.scrolling = false;

        self.scrollTop = 0;
        self.scrollTries = 0;

        self.init = init;

        self.completeCallback;

        //functions
        self.startScroll = startScroll;



        function startScroll(callback){
            self.completeCallback = callback;
            resetScrollState();
            self.scrolling = true;
            self.scrollButton.text('Stop Scroll');
            self.scrollButton.one('click', stopScroll);
            scrollPage();
        }

        function stopScroll(){
            resetScrollState();
            self.scrolling = false;
            self.scrollButton.text('Start Scroll');
            self.scrollButton.one('click', startScroll);

            self.completeCallback();
        }

        function resetScrollState(){
            self.scrollTries = 0;
            self.scrollTop = 0;
        }

        function scrollPage(){
            let scrollTop = $(window).scrollTop();
            let callbackTimeout = 10;

            if(self.scrolling){

                if (self.scrollTop != scrollTop){
                    self.scrollTries = 0;
                } else {
                    self.scrollTries ++;

                    if(self.scrollTries >= 750){
                        stopScroll();
                        return;
                    }
                }

                self.scrollTop = scrollTop;
                window.scrollBy(0,20);
                setTimeout(scrollPage,callbackTimeout);
            }
        }

        /*function addScrollButton(){
            let innerContainer = $('<div></div>');
            let scrollButton = $('<button>Scroll</button>');
            scrollButton.css({
                'padding': '0.4em'
            });
            innerContainer.append(scrollButton);
            container.append(innerContainer);
            scrollButton.one('click', startScroll);
            self.scrollButton = scrollButton;
        }*/

        function init(){
            //addScrollButton();
        }

        init();
    }
})();

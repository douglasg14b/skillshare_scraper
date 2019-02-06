// ==UserScript==
// @name         Skillshare 1
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        *.skillshare.com/*
// @require       https://cdn.jsdelivr.net/jquery/2.1.3/jquery.min.js
// @require       https://cdn.jsdelivr.net/npm/vue@2.6.2/dist/vue.js
// @grant        none
// ==/UserScript==


(function(){

     //Utility
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /*  Init Code */

    var template = `<div id="scraper-vue-app" class="scraper-head">
    <div class="status">
      <b>Status:</b>
      <span>{{status}}...</span>
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
          <td class="found">{{collectionState.totalFound}}</td>
          <td class="added">{{collectionState.totalAdded}}</td>
          <td class="ignored">{{collectionState.totalIgnored}}</td>
        </tr>
      </tbody>
    </table>
    <div class="buttons">
      <button v-on:click="toggleStart()" class="start-toggle">{{startToggleButtonText}}</button>
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
  </style>`;

    function addContainer(){
        container = $('<div"></div>');
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
        container.append(template);
    }

    function createVueApp(){
        app = new Vue(vueAppObj);
        console.log("created vue app");
    }

    function init(){
        addContainer();

        createVueApp();
    }

    /*  Application Code */

    var app;

    var vueAppObj = {
        el: '#scraper-vue-app',
        data: {
            autostart: true,
            status: "Stopped", 
            states: {stopped: "Stopped", scrolling: "Scrolling", collecting: "Collecting", sending: "Sending", next: "Moving Next", complete: "Complete"},      
            collectionState: {
                coursesData : [],
                
                totalFound: 0,
                totalAdded: 0,
                totalIgnored: 0,
                
                foundThisSession: 0,
                sentCount: 0,
                responsesCount: 0
            },
            scrollingState: {
                scrolling: false,
                scrollTop: 0,
                scrollTries: 0,
                scrollRetries: 0
            },
            categoriesState: {
                categories: [],
                categoryIndex: 0,
                sortTypeIndex: 0,
                sortTypes: ['recently-added', 'rating'],
                baseUrl: 'https://www.skillshare.com/browse/'
            }
        },
        methods: {

            /*************************************
              ===== State Management Methods =====
            **************************************/

            toggleStart: function(){
                if(this.status == this.states.stopped){
                    this.status = this.states.scrolling;
                    this.startScrolling();
                    return;
                } else if(this.status = this.states.scrolling) {
                    this.stopScrolling();
                }
                this.status = this.states.stopped;
            },

            scrollingComplete: function(){
                this.stopScrolling();

                //This is here to try and catch a potentially long-loading scroll
                //Since the whole page maxes out at 50 pages with 6 items each (300 total). Having less than 300 might indicate it is not done
                if(this.getCourseCount < 300 && this.scrollRetries < 2){
                    this.startScrolling();
                }

                this.status = this.states.collecting;
                this.startCollection();
            },

            collectionComplete: async function(){

                this.status = this.states.sending;
                await this.sendCourses(0);
            },

            sendingComplete: async function(){
                if(this.categoriesState.categoryIndex -1 == this.categoriesState.categories.length && this.categoriesState.sortTypes == 1){
                    this.status = this.states.complete;
                } else {
                    this.status = this.states.next;
                    this.moveNextSortType();
                }
            },

            everthingComplete: function(){
                this.status = this.states.complete;
            },
    
            /**************************************
             ===== Page Switching Methods =====
            **************************************/

            fillInCollectionStats: function(){
                let self = this.collectionState;
                let urlParams = new URLSearchParams(window.location.search);

                let totalFound = urlParams.get('found');
                let totalAdded = urlParams.get('added');
                let totalIgnored = urlParams.get('ignored');

                if(typeof totalFound !== 'undefined'){
                    self.totalFound = Number(totalFound);
                }

                if(typeof totalAdded !== 'undefined'){
                    self.totalAdded = Number(totalAdded);
                }

                if(typeof totalIgnored !== 'undefined'){
                    self.totalIgnored = Number(totalIgnored);
                }
                

            },

            getCurrentCategory: function(){
                let category = window.location.pathname.split('/')[2];

                let index = this.categoriesState.categories.indexOf(category);

                if(index == -1){
                    throw `Invalid category: ${category}`
                }

                return index;
            },

            getCurrentSortTypeIndex: function(){
                let urlParams = new URLSearchParams(window.location.search);
                let sortType = urlParams.get('sort');

                let index = this.categoriesState.sortTypes.indexOf(sortType);

                if(index == -1){
                    throw `Invalid sort type: ${sortType}`
                }

                return index;
            },

            moveNextSortType: function(){
                let self = this.categoriesState;

                let collectionStatParams = `&found=${this.collectionState.totalFound}&added=${this.collectionState.totalAdded}&ignored=${this.collectionState.totalIgnored}`;

                if(self.sortTypeIndex == 1){
                    self.sortTypeIndex = 0; //reset sort type
                    this.moveNextCategory();
                } else {
                    self.sortTypeIndex ++;
                    let url = self.baseUrl + self.categories[self.categoryIndex] + '?sort=' + self.sortTypes[self.sortTypeIndex] + collectionStatParams;
                    window.location.assign(url);
                }
            },
       

            moveNextCategory: function(){
                let self = this.categoriesState;

                let collectionStatParams = `&found=${this.collectionState.totalFound}&added=${this.collectionState.totalAdded}&ignored=${this.collectionState.totalIgnored}`;

                if(self.categoryIndex == self.categories.length -1){
                    this.everthingComplete();
                } else {
                    self.categoryIndex ++;
                    let url = self.baseUrl + self.categories[self.categoryIndex] + '?sort=' + self.sortTypes[self.sortTypeIndex] + collectionStatParams;
                    window.location.assign(url);
                }
            },

            /**************************************
                ===== Sending Methods =====
            **************************************/

            sendCourses: async function (index){
                let self = this.collectionState;
                let address= "localhost"; //change this if not localhost
                let checkIfSendingComplete = this.checkIfSendingComplete;

                if(index < self.coursesData.length){
                    let chunk = 5; //The number of courses it sends in one go
                    for(let i = 0; i < chunk; i++){
                        
                        if(i+index < self.coursesData.length){
                            self.sentCount ++;
                            $.post("https://"+address+"/skillshare/api/course/new", self.coursesData[i+index]).then(
                                () => { //Success
                                    self.totalAdded ++;
                                    self.responsesCount ++;
                                    checkIfSendingComplete();
                                },
                                (response) => { //Error
                                    
                                    if(response.status != 409){
                                        console.log(response.responseJSON.message);
                                        console.log(response);
                                    }

                                    self.responsesCount ++;
                                    self.totalIgnored ++;
                                    checkIfSendingComplete();
                                }
                            );
                        } else {
                            break;
                        }
                    }

                    this.checkIfSendingComplete();
                    await sleep(350);
                    this.sendCourses(index + chunk);
                }
            },


            checkIfSendingComplete: function(){
                let self = this.collectionState;

                if(self.foundThisSession == self.responsesCount){
                    this.sendingComplete();
                }
            },

            /*************************************
             ===== Category Collection Methods =====
            **************************************/

            getCategories: function(flatten){
                let categories = [];
                let cleanCategoryName = this.cleanCategoryName;
                $('.side-sticky-menu-wrapper .content-body .tag-link-wrapper.primary-tag-link-wrapper').each(function(index){

                    let category = {};
                    category.text = cleanCategoryName($(this).children('a.tag-link').attr('data-ss-tag-slug'));

                    category.hasChildren = $(this).children('.related-tags-flyover').length != 0;
                    if(category.hasChildren){
                        category.children = [];
                        $(this).children('.related-tags-flyover').find('.tag-link-wrapper a.tag-link').each(function(index){
                            if(index > 0){
                                category.children.push(cleanCategoryName($(this).attr('data-ss-tag-slug')));
                            }
                        })
                    }
                    categories.push(category);
                });

                if(flatten){
                    let flatCategories = [];
                    for(let i = 0; i < categories.length; i++){
                        flatCategories.push(categories[i].text);

                        if(categories[i].hasChildren){
                            flatCategories = flatCategories.concat(categories[i].children);
                        }
                    }

                    return flatCategories;
                }

                return categories;
            },

            //Cleans category names to turn them into the url-friendly tags
            cleanCategoryName:function(name, index){
                let clean = name.toLowerCase().replace(' ', '-').replace('/', '-').replace('&', 'and');
                return clean;
            },

            /*************************************
                ===== Collection Methods =====
            **************************************/

            startCollection: function(){
                let self = this.collectionState;

                self.coursesData.length = 0; //reset courses data
                self.sentCount = 0;
                self.responsesCount = 0;

                this.collectData();
            },

            //Collects the page course data
            collectData: async function(){
                let self = this.collectionState;
                let parseLinkAndId = this.parseLinkAndId;

                $('.col-4 .ss-card__title a').each(function(index){
                    self.totalFound++;
                    self.foundThisSession++;

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
                this.collectionComplete();
            },

            //Used by the 
            parseLinkAndId : function (text){
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
            },

            getCourseCount: function(){
                return $('.col-4 .ss-card__title a').length;
            },

            /*************************************
                ===== Scrolling Methods =====
            **************************************/

            startScrolling: function(){
                let self = this.scrollingState;
                self.scrolling = true;
                self.scrollTries = 0;
                self.scrollTop = 0;

                this.scrollPage();
            },

            stopScrolling: function(){
                let self = this.scrollingState;

                self.scrolling = false;
                self.scrollTries = 0;
                self.scrollTop = 0;

            },

            scrollPage: function(){
                let self = this.scrollingState;
                let scrollTop = $(window).scrollTop();
    
                if(self.scrolling){
    
                    if (self.scrollTop != scrollTop){
                        self.scrollTries = 0;
                        self.scrollRetries = 0; //Reset retries since there was scrolling left to do
                    } else {
                        self.scrollTries ++;
    
                        if(self.scrollTries >= 750){
                            this.scrollingComplete();
                            return;
                        }
                    }
    
                    self.scrollTop = scrollTop;
                    window.scrollBy(0,20);
                    setTimeout(this.scrollPage, 10);
                }
            }
        },
        computed: {
            startToggleButtonText: function(){
                switch(this.status){
                    case this.states.stopped:
                        return "Start";
                    case this.states.scrolling:
                    case this.states.collecting:
                    case this.states.sending:
                    case this.states.next:
                        return "Stop";
                }
            }
        },
        mounted: function () {
            console.log("Mounted")

            this.categoriesState.categories = this.getCategories(true);

            this.categoriesState.categoryIndex = this.getCurrentCategory();
            this.categoriesState.sortTypeIndex = this.getCurrentSortTypeIndex();

            this.fillInCollectionStats();

            console.log(this.categoriesState);

            if(this.autostart){
                this.toggleStart();
            }
        },

    }


    init();
})();

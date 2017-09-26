
class FileDownload {
    constructor(file, $q, $scope, $timeout, coursesService, messages){
        this.file = file;
        this.$q = $q;
        this.coursesService = coursesService;
        this.messages = messages;
        this.$scope = $scope;
        this.$timeout = $timeout;

        this.downloadAttempts = 0;
        this.progressMonitor = {};
    }

    async startDownload(url, path, fileName){
        this.deferred = this.$q.defer();

        this.fileInfo = {
          url: url,
          path: path,
          fileName: fileName
        };

        this.setProgressMonitor(0);
        this.coursesService.downloadEpisode(path, fileName, url).then(
          (result) => { this.handleDownloadInitSuccess(result) });

        return this.deferred.promise;
    }

    restartDownload(){
        this.downloadAttempts ++;
        this.setProgressMonitor(0);
        this.coursesService.downloadEpisode(this.fileInfo.path, this.fileInfo.fileName, this.fileInfo.url).then(
          (result) => { this.handleDownloadInitSuccess(result) });      
    }

    monitorProgress(){
        this.coursesService.getProgress(this.progressId).then((result) => {this.handleProgressSuccess(result)});
    }

    handleDownloadInitSuccess(result){
        this.progressId = result.data.progressId;
        this.monitorProgress();
    }

    handleProgressSuccess(result){
        let data = result.data.data;
        this.file.downloadedSize = data.downloaded;

        if(!this.checkDownloadStagnant(data.downloaded)){
          if(this.downloadAttempts == 10){
            this.deferred.reject();
            return;
          }
          this.restartDownload();
          return;
        }

        this.lastDownloaded = data.downloaded;

        if(this.progressMonitor.downloaded < data.downloaded){
          this.setProgressMonitor(data.downloaded);
        }

        if(data.totalSize == -1 || data.downloaded < data.totalSize){
           this.$timeout(() => { this.monitorProgress(); }, 1000);
        } else {
          this.deferred.resolve();
        }
    }

    checkDownloadStagnant(downloaded){
      let now = new Date().getTime();
      if(now - this.progressMonitor.lastChecked > 10000 && this.progressMonitor.downloaded == downloaded){ //It's been 10 seconds with no progress
        return false;
      }
      return true;
    }

    setProgressMonitor(downloaded){
      this.progressMonitor.downloaded = downloaded;
      this.progressMonitor.lastChecked = new Date().getTime();
    }


}




// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

function generateArrayOfObjects(length){
    let output = [];
    for(let i = 0; i < length; i++){
      output.push({});
    }
    return output;
}

//Generates an array of numbers of the length of the provided value
function getNumArray(number, min){
    let list = Array.from(Array(number + 1).keys());
    if(min){
        return list.splice(min);
    }
    return list;
}

function hashToArray(hash){
  let output = [];
  let keys = Object.keys(hash);
  for(let i = 0; i < keys.length; i++){
    output.push(hash[keys[i]]);
  }
  return output;
}

function arrayToHashByProperty(array, property){
  let output = {};
  for(var i = 0; i < array.length; i++){
    output[array[i][property]] = array[i];
  }
  return output;
}

function findIndexInArray(array, property, value){
  for(let i = 0; i < array.length; i++){
    if(array[i][property] == value){
      return i;
    }
  }
  return -1;
}

//http://stackoverflow.com/a/5306832
function moveItemInArray(array, oldIndex, newIndex){
  if(newIndex >= array.length){
    let k = newIndex - array.length;
    while((k--) + 1){
      array.push(undefined);
    }
  }
  array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
}

function moveItemToArray(arrayFrom, arrayTo, oldIndex, newIndex){
  if(newIndex > arrayTo.length){
    let k = newIndex - arrayTo.length;
    while((k--) + 1){
      arrayTo.push(undefined);
    }    
  }
  arrayTo.splice(newIndex, 0, arrayFrom.splice(oldIndex, 1)[0]);
}

  //Used to convert the YYYY-mm-dd dates from the DB
  function convertDate(value){
      if(value !== null && typeof value !== 'undefined'){
          let splitDate = value.split('-');
          return new Date(Number(splitDate[0]), Number(splitDate[1]) - 1, Number(splitDate[2])).getTime();
      }
      return null;
  }

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

function toBool(value){
  if(isEmpty(value)){
    return false;
  }

  if(typeof value === 'boolean'){
    return value;
  }

  if(typeof value === 'string'){
    return value.toLowerCase() == 'true';
  }

  if(typeof value === 'number'){
    return Number(value) > 0;
  }

  throw "Invalid argument";
}

/* Instantiateable message manager for controllers or services */
class MessageManager {
  constructor($timeout){

    this.$timeout = $timeout;
    this.errors = [];
    this.warnings = [];
    this.messages = [];
  }

  getArrayByType(type){
    switch(type){
      case 'error':
        return this.errors;
      case 'warning':
        return this.warnings;
      case 'message':
        return this.messages;
      default:
        return false;
    }
  }

  //Adds a new message of the specified type
  add(type, identifier, message, timeout){
    let self = this;

    let messageArray = self.getArrayByType(type);
    if(!messageArray){
      throw 'Incorrect Type Arguments';
    }
    
    if(findIndexInArray(messageArray, 'id', identifier) !== -1){
      messageArray.splice(findIndexInArray(messageArray, 'id', identifier), 1);
    }
        
    if(!timeout){
      messageArray.push({id: identifier, message:message});
      return;
    }
    
    let index = messageArray.length;
    messageArray.push({id: identifier, message:message});
    self.$timeout(function(){self.remove(type, identifier);}, timeout);
  }

  //Removes a message of the specified type and ID, or at index
  remove(type, identifier, index){
    let self = this;

    let messageArray = self.getArrayByType(type);
    if(!messageArray){
      throw 'Incorrect Type Arguments';
    }
    
    if(index){
      messageArray.splice(index, 1);
      return;
    }
    
    index = findIndexInArray(messageArray, 'id', identifier);
    if(index !== -1){
      messageArray.splice(index, 1);    
    }    
  }
  
  //Removes all messages of a certain type
  removeAll(type){
    let self = this;
    if(type !== 'errors' && type !== 'warnings' && type !== 'messages' && typeof type !== 'undefined'){
      throw 'Incorrect Type Arguments';
    }
    
    if(typeof type !== 'undefined'){
      self[type].length = 0;
      return;
    }
    
    self.errors.length = 0;
    self.warnings.length = 0;
    self.messages.length = 0;
    
  }
}
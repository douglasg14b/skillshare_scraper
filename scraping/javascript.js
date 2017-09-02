
$(document).ready(function(){
    function init(){
        if(!isEmpty(getQueryString())){
            $('iframe').attr('src', getQueryString());
        }
    }

    init();
})

function getQueryString(){
    let rawQuery = window.location.search;
    if(!isEmpty(rawQuery)){
        return rawQuery.substring(1, rawQuery.length);
    }
    return false;
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
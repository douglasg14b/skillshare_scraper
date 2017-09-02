
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

$('.col-4 .title-link a').each(function(index){
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
    $.post("https://192.168.2.4/skillshare/api/course/new", output);
})



function pageScroll() {
    window.scrollBy(0,10);
    scrolldelay = setTimeout(pageScroll,10);
}


<?php

class Episode {

    var $episodeId;
    var $courseId;
    var $number;
    var $createdAt;
    var $title;
    var $videoId;
    var $videoUrl;

    var $size;
    var $height;
    var $width;
    var $duration;
    var $avgBitrate;
    var $hasSource;

    //Custom JSON serilization to ignore navigation properties
    public function GetAsJSON(){
        
    }
}
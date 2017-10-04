<?php

include_once ROOT_PATH.'/api/helper.php';

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

    var $sanitizedName;
    var $fileName;

    public function SanitizeName(){
		$this->sanitizedName = Filename($this->title);
	}

    public function GenerateFileName(){
        $number = str_pad($this->number, 3, '0', STR_PAD_LEFT);
        $this->fileName = $number.' '.$this->sanitizedName.'.mp4';
    }

    //Custom JSON serilization to ignore navigation properties
    public function GetAsJSON(){
        
    }
}
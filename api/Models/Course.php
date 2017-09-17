<?php

include_once '/../helper.php';

class Course {

    var $id;
    var $name;
    var $description;
    var $link;
    var $relativePath;
    var $pathChunks = []; //Array of path chunks

    var $students;
    var $totalRatings;
    var $positiveRatings;

    var $episodesCount;
    var $episodes; //Array

    var $attachmentsCount;

    var $authorId; //Navigation property
    var $author; //Object

    var $projectId; //Navigation property
    var $project; //Object

    var $tags; //Array

    var $sanitizedName;

    public function SortEpisodes(){
        usort($this->episodes, function($a, $b){
            return $a->number - $b->number;
        });        
    }

    public function SortTags(){
        usort($this->tags, function($a, $b){
            return $b->followers - $a->followers;
        });
    }

    public function GeneratePathChunks(){
       $primaryTag = $this->tags[0];
       $secondaryTag = $this->tags[1];

       array_push($this->pathChunks, $primaryTag->slug);
       array_push($this->pathChunks, $this->sanitizedName);

       $this->relativePath = $this->pathChunks[0].'\\'.$this->pathChunks[1].'\\';
    }

    public function SanitizeName(){
		$this->sanitizedName = Filename($this->name);
	}

    //Custom JSON serilization to ignore navigation properties
    public function GetAsJSON(){
        
    }
}
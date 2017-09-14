<?php

class Course {

    var $id;
    var $name;
    var $description;
    var $link;
    var $path;

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

    //Custom JSON serilization to ignore navigation properties
    public function GetAsJSON(){
        
    }
}
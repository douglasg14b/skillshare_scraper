<?php

class Author {

    var $id;
    var $name;
    var $link;

    //Custom JSON serilization to ignore navigation properties
    public function GetAsJSON(){
        
    }
}
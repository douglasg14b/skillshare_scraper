<?php
include_once ROOT_PATH.'/api/helper.php';

class Attachment {

    var $id;
    var $projectId;
    var $title;
    var $link;
    var $sizeString;
    var $size;

    var $sanitizedName;

    public function SanitizeName(){
        $this->sanitizedName = Filename($this->title);
    }
}
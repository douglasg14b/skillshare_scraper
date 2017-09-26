<?php
require_once 'Factory.php';

class AttachmentFactory extends Factory {
    
    const dbMap = [
        'id' => ['attachments', 'id'],
        'projectId' => ['attachments', 'project_id'],
        'title' => ['attachments', 'title'],
        'link' => ['attachments', 'url'],
        'sizeString' => ['attachments', 'size_string'],
        'size' => ['attachments', 'size'],
    ];
    
    public static function RenderManyFromDb($values){
        $output = [];
        foreach($values as $fieldData){
            array_push($output, self::RenderFromDb($fieldData));
        }
        return $output;
    }
    
    public static function RenderFromDb($values){
        $class = self::BuildClassFromArray('Attachment', $values);
        $class->SanitizeName();
        return $class;
    }

    public static function RenderManyFromClient($data){
        return self::RenderManyFromDb($data);
    }

    public static function GetMapAsColumns(){
        return self::ContructColumnsFromMap(self::dbMap);
    }
}
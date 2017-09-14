<?php
require_once 'Factory.php';

class ProjectFactory extends Factory {
    
    const dbMap = [
        'id' => ['projects', 'id'],
        'guide' => ['projects', 'project_guide'],
        'hasAttachments' => ['projects', 'has_attachments']
    ];
    
    public static function RenderManyFromDb($values){
        $output = [];
        foreach($values as $fieldData){
            array_push($output, self::RenderFromDb($fieldData));
        }
        return $output;
    }
    
    public static function RenderFromDb($values){
        $class = self::BuildClassFromArray('Project', $values);
        return $class;
    }

    public static function RenderManyFromClient($data){
        return self::RenderManyFromDb($data);
    }

    public static function GetMapAsColumns(){
        return self::ContructColumnsFromMap(self::dbMap);
    }
}
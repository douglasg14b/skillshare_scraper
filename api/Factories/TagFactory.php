<?php
require_once 'Factory.php';

class TagFactory extends Factory {
    
    const dbMap = [
        'name' => ['tags', 'name'],
        'slug' => ['tags', 'slug'],
        'classes' => ['tags', 'classes'],
        'followers' => ['tags', 'followers']
    ];
    
    public static function RenderManyFromDb($values){
        $output = [];
        foreach($values as $fieldData){
            array_push($output, self::RenderFromDb($fieldData));
        }
        return $output;
    }
    
    public static function RenderFromDb($values){
        $class = self::BuildClassFromArray('Tag', $values);
        return $class;
    }

    public static function RenderManyFromClient($data){
        return self::RenderManyFromDb($data);
    }

    public static function GetMapAsColumns(){
        return self::ContructColumnsFromMap(self::dbMap);
    }
}
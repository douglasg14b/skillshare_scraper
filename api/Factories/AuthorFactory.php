<?php
require_once 'Factory.php';

class AuthorFactory extends Factory {
    
    const dbMap = [
        'id' => ['authors', 'author_id'],
        'name' => ['authors', 'name'],
        'link' => ['authors', 'url'],
    ];
    
    public static function RenderManyFromDb($values){
        $output = [];
        foreach($values as $fieldData){
            array_push($output, self::RenderFromDb($fieldData));
        }
        return $output;
    }
    
    public static function RenderFromDb($values){
        $class = self::BuildClassFromArray('Author', $values);
        return $class;
    }

    public static function RenderManyFromClient($data){
        return self::RenderManyFromDb($data);
    }

    public static function GetMapAsColumns(){
        return self::ContructColumnsFromMap(self::dbMap);
    }
}
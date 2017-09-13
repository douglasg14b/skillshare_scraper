<?php
require_once 'Factory.php';

class CourseFactory extends Factory {
    
    const dbMap = [
        'id' => ['courses', 'course_id'],
        'name' => ['courses', 'name'],
        'link' => ['courses', 'link'],
        'path' => ['courses', 'download_path'],
        'students' => ['courses_meta', 'students'],
        'totalRatings' => ['courses_meta', 'reviews_total'],
        'positiveRatings' => ['courses_meta', 'reviews_positive'],
        'description' => ['courses_meta', 'description'],
        'authorId' => ['courses_meta', 'author'],
        'episodesCount' => ['episodes', 'count'],
        'attachmentsCount' => ['attachments', 'count'],
    ];
    
    public static function RenderManyFromDb($values){
        $output = [];
        foreach($values as $fieldData){
            array_push($output, self::RenderFromDb($fieldData));
        }
        return $output;
    }
    
    public static function RenderFromDb($values){
        $class = self::BuildClassFromArray('Course', $values);
        return $class;
    }

    public static function RenderManyFromClient($data){
        return self::RenderManyFromDb($data);
    }

    public static function GetMapAsColumns(){
        return self::ContructColumnsFromMap(self::dbMap);
    }
}
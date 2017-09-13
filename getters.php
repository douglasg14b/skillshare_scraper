<?php
require_once "assets\MysqliDb\MysqliDb.php";
require_once "config.php";

require_once 'Factories/CourseFactory.php';
require_once 'Factories/EpisodeFactory.php';

class Getters {

    public static function Get($tableName, $criteria, $columns, $limit = null){
        $db = getDBInstance();
        foreach($criteria as $column => $value){
            $db->where($column, $value);
        }
        return $db->get($tableName, $limit, $columns);   
    }

    public static function GetValue($tableName, $criteria, $columnName){
        $db = getDBInstance();
        foreach($criteria as $column => $value){
            $db->where($column, $value);
        }
        return $db->getValue($tableName, $columnName);   
    }

    public static function GetCourseData($courseId){
        $db = getDBInstance();
        $columns = CourseFactory::GetMapAsColumns();

        $sq1 = $db->subQuery('episodes');
        $sq1->groupBy('course_id');
        $sq1->get('episodes', null, ['course_id, COUNT(course_id) as count']);

        $sq2 = $db->subQuery('attachments');
        $sq2->groupBy('course_id');
        $sq2->get('attachments', null, ['course_id, COUNT(course_id) as count']);

        $db->join('courses_meta', 'courses_meta.course_id = courses.course_id', 'INNER');
        $db->join($sq1, 'episodes.course_id = courses.course_id', 'INNER');
        $db->join($sq2, 'attachments.course_id = courses.course_id', 'INNER');

        $db->where('downloaded', false);
        $courseData = $db->get('courses', 1, $columns);
        $course = CourseFactory::RenderFromDb($courseData[0]);
        return $course;
    }

    public static function GetCourseEpisodes($courseId){
        $db = getDBInstance();
        $columns = EpisodeFactory::GetMapAsColumns();

        $db->where('course_id', $courseId);
        $episodesData = $db->get('episodes', null, $columns);
        $episodes = EpisodeFactory::RenderManyFromDb($episodesData);
        return $episodes;
    }

    public static function GetAuthor($courseId){
        $db = getDBInstance();

    }
    /* Prevents creating more DB connectons than needed */
    private static function getDBInstance(){
        $db = MysqliDb::getInstance();
        
        if(!isset($db)){
            $db = new MysqliDb(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        }
        return $db;
    }    
}
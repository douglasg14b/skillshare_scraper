<?php
require_once "assets\MysqliDb\MysqliDb.php";
require_once "config.php";

require_once ROOT_PATH.'/api/Factories/CourseFactory.php';
require_once ROOT_PATH.'/api/Factories/EpisodeFactory.php';
require_once ROOT_PATH.'/api/Factories/AuthorFactory.php';
require_once ROOT_PATH.'/api/Factories/ProjectFactory.php';
require_once ROOT_PATH.'/api/Factories/AttachmentFactory.php';
require_once ROOT_PATH.'/api/Factories/TagFactory.php';

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

    public static function GetCourse($courseId){
        $courseData = self::GetCourseData($courseId);
        if(!$courseData){
            return false;
        }
        $courseId = $courseData['id'];

        $courseData['author'] = self::GetAuthor($courseData['authorId']);
        $courseData['project'] = self::GetCourseProject($courseId);
        $courseData['episodes'] = self::GetCourseEpisodes($courseId);
        $courseData['tags'] = self::GetCourseTags($courseId);
        $course = CourseFactory::RenderFromDb($courseData);
        return $course;
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
        $db->join($sq2, 'attachments.course_id = courses.course_id', 'LEFT');

        $db->where('courses.course_id', $courseId);
        $courseData = $db->get('courses', 1, $columns);
        return $courseData[0];
    }

    public static function GetCourseEpisodes($courseId){
        $db = getDBInstance();
        $columns = EpisodeFactory::GetMapAsColumns();

        $db->where('course_id', $courseId);
        $episodesData = $db->get('episodes', null, $columns);
        $episodes = EpisodeFactory::RenderManyFromDb($episodesData);
        return $episodes;
    }

    public static function GetAuthor($authorId){
        $db = getDBInstance();
        $columns = AuthorFactory::GetMapAsColumns();

        $db->where('author_id', $authorId);
        $authorData = $db->get('authors', null, $columns);
        $author = AuthorFactory::RenderFromDb($authorData[0]);
        return $author;
    }

    public static function GetCourseProject($courseId){
        $db = getDBInstance();
        $columns = ProjectFactory::GetMapAsColumns();

        $db->where('course_id', $courseId);
        $projectData = $db->get('projects', null, $columns);
        $projectData[0]['attachments'] = self::GetAttachmentsForProject($projectData[0]['id']);
        $project = ProjectFactory::RenderFromDb($projectData[0]);
        return $project;
    }

    public static function GetAttachmentsForProject($projectId){
        $db = getDBInstance();
        $columns = AttachmentFactory::GetMapAsColumns();

        $db->where('project_id', $projectId);
        $attachmentsData = $db->get('attachments', null, $columns);
        $attachments = AttachmentFactory::RenderManyFromDb($attachmentsData);
        return $attachments;
    }  

    public static function GetCourseTags($courseId){
        $db = getDBInstance();
        $columns = TagFactory::GetMapAsColumns();

        $db->where('course_id', $courseId);
        $db->join('tags', 'tags.id = course_tags.tag_id');
        $tagsData = $db->get('course_tags', null, $columns);
        $tags = TagFactory::RenderManyFromDb($tagsData);
        return $tags;
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
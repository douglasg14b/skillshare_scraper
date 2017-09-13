<?php
require_once 'setters.php';
require_once 'getters.php';

class CourseProcessor {

    public static function ProcessCourse($course){
        $db = self::getDBInstance();
        $db->startTransaction();
        try {            
            self::VerifyCourse($course);
            Setters::updateRow($course['sku'], 'course_id', 'courses', ['downloaded_meta' => true]);
            if(self::ProcessCourseMeta($course)){
                self::ProcessAuthor($course['author']);
                self::ProcessEpisodes($course['episodes'], $course['sku']);
                self::ProcessProject($course['project'], $course['sku']);
                self::ProcessTags($course['tags'], $course['sku']);
                $db->commit();
                return [
                    'status' => 'success'
                ];         
            }
            $db->commit();
            return [
                'status' => 'duplicate'
            ];
        } catch(Exception $ex){
            $result = [
                'status' => 'error',
                'message' => $ex->getMessage()
            ];   
            $db->rollback();
            return $result;        
        }
    }

    //Verifies course is all there
    private static function VerifyCourse($course){
        if(!array_key_exists('author', $course) || empty($course['author'])){
            throw new Exception("Course missing author");
        } else {
            $authorKeys = [
                'id',
                'name',
                'url'
            ];
            foreach($authorKeys as $property){
                if(!array_key_exists($property, $course['author']) || empty($course['author'][$property])){
                    throw new Exception("Author missing $property");
                }
            }            
        }

        if(!array_key_exists('description', $course) || empty($course['description'])){
            throw new Exception("Course missing description");
        }

        if(!array_key_exists('sku', $course) || empty($course['sku'])){
            throw new Exception("Course missing sku");
        }

        if(!array_key_exists('students', $course)){
            throw new Exception("Course missing students");
        }        
        //Episodes section
        if(array_key_exists('episodes', $course) && !empty($course['episodes'])){
            foreach($course['episodes'] as $episode){
                $episodeKeys = [
                    'createdAt',
                    'episodeId',
                    'number',
                    'source',
                    //'thumbnails',
                    'title',
                    'videoId'
                ];
                $sourceKeys = [
                    'avgBitrate',
                    'duration',
                    'height',
                    'size',
                    'url',
                    'width'
                ];

                $thumbnailKeys = [
                    'huge',
                    'large',
                    'medium',
                    'small',
                    'thumbnail',
                    'original'
                ];
                if(!$episode['hasSource']){
                    continue;
                }

                foreach($episodeKeys as $property){
                    if(!array_key_exists($property, $episode) || empty($episode[$property])){
                        if(gettype($episode[$property]) == "string" || gettype($episode[$property]) == "integer"){
                            if(strlen($episode[$property]) == 0){
                                $num = $episode['number'];
                                throw new Exception("Episode $num missing $property");
                            }
                        } else {
                            $num = $episode['number'];
                            throw new Exception("Episode $num missing $property");
                        }
                    }
                }

                foreach($sourceKeys as $property){
                    if(!array_key_exists($property, $episode['source']) || empty($episode['source'][$property])){
                        throw new Exception("Episode Source missing $property");
                    }
                }   

                //Inserts blank thumbnail values where missing
                foreach($thumbnailKeys as $property){
                    if(!array_key_exists($property, $episode['thumbnails']) || empty($episode['thumbnails'][$property])){
                        $episode['thumbnails'][$property] = null;
                    }
                }  
            }
        } else {
            return false;
        }

        //Project section, courses can have no project
        if(array_key_exists('project', $course) && !empty($course['project'])){
            if($course['project']['hasAttachments']){
                foreach($course['project']['attachments'] as $attachment){
                    $keys = [
                        'size',
                        'sizeString',
                        'title',
                        'url'
                    ];

                    foreach($keys as $property){
                        if(!array_key_exists($property, $attachment)){
                            throw new Exception("Attachment missing $property");
                        }
                    }
                }
            }
            if(!array_key_exists('projectGuide', $course['project']) || empty($course['project']['projectGuide'])){
                throw new Exception("Project missing projectGuide");
            }
        } else {
            $course['hasProject'] = false;
        }

        if(array_key_exists('reviews', $course) && !empty($course['reviews'])){
            $keys = [
                'positive',
                'total',
            ];
            foreach($keys as $property){
                if(!array_key_exists($property, $course['reviews'])){
                    throw new Exception("Reviews missing $property");
                }
            }        
        } else {
            throw new Exception("Course missing reviews");
        }

        if(array_key_exists('tags', $course) && !empty($course['tags'])){
            foreach($course['tags'] as $tag){
                $keys = [
                    'name',
                    'numClasses',
                    'numFollowers',
                    'slug'
                ];
                foreach($keys as $property){
                    if(!array_key_exists($property, $tag)){
                        throw new Exception("Tag missing $property");
                    }
                }    
            }  
        } else {
            throw new Exception("Course missing tags");
        }      
    }

    private static function ProcessCourseMeta($course){
        if(!Setters::rowExists('courses_meta', ['course_id' => $course['sku']])){
            $id = Setters::insertRow('courses_meta', [
                'course_id' => $course['sku'],
                'students' => $course['students'],
                'reviews_total' => $course['reviews']['total'],
                'reviews_positive' => $course['reviews']['positive'],
                'description' => $course['description'],
                'author' => $course['author']['id']
            ]);
            if(!$id){
                $db = self::getDBInstance();
                throw new Exception($db->getLastError());                
            }
            return true;                
        }
        return false;
    }

    private static function ProcessAuthor($author){
        if(!Setters::rowExists('authors', ['author_id' => $author['id']])){
            $id = Setters::insertRow('authors', [
                'author_id' => $author['id'],
                'name' => $author['name'],
                'url' => $author['url']
            ]);
            if(!$id){
                $db = self::getDBInstance();
                throw new Exception($db->getLastError());
            }
        }
    }

    private static function ProcessEpisodes($episodes, $courseId){
        $db = self::getDBInstance();
        foreach($episodes as $episode){

            //Some episodes won't have thumbnails
            if(array_key_exists('thumbnails', $episode) && !empty($episode['thumbnails'])){
                self::ProcessEpisodeThumbnails($episode['thumbnails'], $episode['episodeId']);
            }

            if(!Setters::rowExists('episodes', ['episode_id' => $episode['episodeId']])){
                $id = null;
                if($episode['hasSource']){
                    $id = Setters::insertRow('episodes', [
                        'episode_id' => $episode['episodeId'],
                        'course_id' => $courseId,
                        'number' => $episode['number'],
                        'created_at' => $db->func("STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ')", [$episode['createdAt']]),
                        'title' => $episode['title'],
                        'video_id' => $episode['videoId'],
                        'video_avg_bitrate' => $episode['source']['avgBitrate'],
                        'video_duration' => $episode['source']['duration'],
                        'video_height' => $episode['source']['height'],
                        'video_size' => $episode['source']['size'],
                        'video_url' => $episode['source']['url'],
                        'video_width' => $episode['source']['width'],
                        'has_source' => true
                    ]);
                } else {
                    $insertData = [
                        'episode_id' => $episode['episodeId'],
                        'course_id' => $courseId,
                        'number' => $episode['number'],
                        'title' => $episode['title'],
                        'has_source' => false                     
                    ];
                    if(array_key_exists('createdAt', $episode) && !empty($episode['createdAt'])){
                        $insertData['created_at'] = $db->func("STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ')", [$episode['createdAt']]);
                    }
                    if(array_key_exists('videoId', $episode) && !empty($episode['videoId'])){
                        $insertData['video_id'] = $episode['videoId'];
                    }    
                                    
                    $id = Setters::insertRow('episodes', $insertData);               
                }
                if(!$id){
                    throw new Exception($db->getLastError());
                }         
            }
        }
    }

    private static function ProcessEpisodeThumbnails($thumbnails, $episodeId){
        if(!Setters::rowExists('thumbnails', ['episode_id' => $episodeId])){
            $keys = [
                'huge',
                'large',
                'medium',
                'small',
                'thumbnail',
                'original'
            ];
            $insertData = [
                'episode_id' => $episodeId,
            ];
            foreach($keys as $key){
                if(array_key_exists($key, $thumbnails)){
                    $insertData[$key.'_url'] = $thumbnails[$key];
                }
            }
            $id = Setters::insertRow('thumbnails', $insertData);
            if(!$id){
                $db = self::getDBInstance();
                throw new Exception($db->getLastError());
            }            
        }
    }

    private static function ProcessProject($project, $courseId){
        if(!Setters::rowExists('projects', ['course_id' => $courseId])){
            $id = Setters::insertRow('projects', [
                'course_id' => $courseId,
                'has_attachments' => $project['hasAttachments'],
                'project_guide' => $project['projectGuide']
            ]);
            if(!$id){
                $db = self::getDBInstance();
                throw new Exception($db->getLastError());
            } else if($project['hasAttachments']) {
                self::ProcessAttachments($id, $courseId, $project['attachments']);
            }
        }
    }

    private static function ProcessAttachments($projectId, $courseId, $attachments){
        foreach($attachments as $attachment){
            $id = Setters::insertRow('attachments', [
                'course_id' => $courseId,
                'project_id' => $projectId,
                'title' => $attachment['title'],
                'url' => $attachment['url'],
                'size_string' => $attachment['sizeString'],
                'size' => $attachment['size']
            ]);
            if(!$id){
                $db = self::getDBInstance();
                throw new Exception($db->getLastError());
            }
        }
    }

    private static function ProcessTags($tags, $courseId){
        foreach($tags as $tag){
            $tagId = self::ProcessTag($tag);
            $id = Setters::insertRow('course_tags', [
                'tag_id' => $tagId,
                'course_id' => $courseId
            ]);
            if(!$id){
                $db = self::getDBInstance();
                throw new Exception($db->getLastError());
            }
        }
    }

    //Returns tag id if exists, if not creates tag and returns id
    private static function ProcessTag($tag){
        if(!Setters::rowExists('tags', ['name' => $tag['name']])){
            $id = Setters::insertRow('tags', [
                'name' => $tag['name'],
                'slug' => $tag['slug'],
                'classes' => $tag['numClasses'],
                'followers' => $tag['numFollowers'],
            ]);
            if(!$id){
                $db = self::getDBInstance();
                throw new Exception($db->getLastError());
            } else {
                return $id;
            }        
        } else {
            $id = Getters::GetValue('tags', ['name' => $tag['name']], 'id');
            if(!$id){
                throw new Exception($db->getLastError());
            } else {
                return $id;
            }
        }
    }

    private static function getDBInstance(){
        $db = MysqliDb::getInstance();
        
        if(!isset($db)){
            $db = new MysqliDb(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        }
        return $db;
    }
}
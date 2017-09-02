<?php
class CourseProcessor {

    public static function ProcessCourse($course){
        try {
            self::VerifyCourse($course);
            return [
                'status' => 'success',
                'message' => 'success'
            ];
        } catch(Exception $ex){
            return [
                'status' => 'error',
                'message' => $ex->getMessage()
            ];            
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
                    'thumbnails',
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
                foreach($episodeKeys as $property){
                    if(!array_key_exists($property, $episode) || empty($episode[$property])){
                        throw new Exception("Episode missing $property");
                    }
                }

                foreach($sourceKeys as $property){
                    if(!array_key_exists($property, $episode['source']) || empty($episode['source'][$property])){
                        throw new Exception("Episode Source missing $property");
                    }
                }   

                foreach($thumbnailKeys as $property){
                    if(!array_key_exists($property, $episode['thumbnails']) || empty($episode['thumbnails'][$property])){
                        throw new Exception("Thumbnails missing $property");
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
                        if(!array_key_exists($property, $attachment) || empty($attachment[$property])){
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
                    if(!array_key_exists($property, $tag) || empty($tag[$property])){
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
        }
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
        foreach($episodes as $episode){
            self::ProcessEpisodeThumbnails($episode['thumbnails'], $episode['episodeId']);

            if(!Setters::rowExists('episodes', ['episode_id' => $episode['episodeId'])){
                $id = Setters::insertRow('episodes', [
                    'episode_id' => $episode['episodeId'],
                    'course_id' => $courseId,
                    'number' => $episode['number'],
                    'created_at' => $episode['createdAt'],
                    'title' => $episode['title'],
                    'video_id' => $episode['videoId'],
                    'video_avg_bitrate' => $episode['avgBitrate'],
                    'video_duration' => $episode['duration'],
                    'video_height' => $episode['height'],
                    'video_size' => $episode['size'],
                    'video_url' => $episode['url'],
                    'video_width' => $episode['width'],                    
                ]);
                if(!$id){
                    $db = self::getDBInstance();
                    throw new Exception($db->getLastError());
                }         
            }
        }
    }

    private static function ProcessEpisodeThumbnails($thumbnails, $episodeId){
        if(!Setters::rowExists('thumbnails', ['episode_id' => $episodeId)){
            $id = Setters::insertRow('thumbnails', [
                'episode_id' => $episodeId,
                'huge_url' => $thumbnails['huge'],
                'large_url' => $thumbnails['large'],
                'medium_url' => $thumbnails['medium'],
                'small_url' => $thumbnails['small'],
                'thumbnail_url' => $thumbnails['thumbnail'],
                'original_url' => $thumbnails['original'],
            ]);
            if(!$id){
                $db = self::getDBInstance();
                throw new Exception($db->getLastError());
            }            
        }
    }

    private static function ProcessProject(){
        
    }

    private static function getDBInstance(){
        $db = MysqliDb::getInstance();
        
        if(!isset($db)){
            $db = new MysqliDb(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        }
        return $db;
    }
}
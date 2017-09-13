<?php
require_once 'Factory.php';

class EpisodeFactory extends Factory {
    
    const dbMap = [
        'episodeId' => ['episodes', 'episode_id'],
        'courseId' => ['episodes', 'course_id'],
        'number' => ['episodes', 'number'],
        'createdAt' => ['episodes', 'created_at'],
        'title' => ['episodes', 'title'],
        'videoId' => ['episodes', 'video_id'],
        'videoUrl' => ['episodes', 'video_url'],
        'size' => ['episodes', 'video_size'],
        'height' => ['episodes', 'video_height'],
        'width' => ['episodes', 'video_width'],
        'duration' => ['episodes', 'video_duration'],
        'avgBitrate' => ['episodes', 'video_avg_bitrate'],
        'hasSource' => ['episodes', 'has_source'],
    ];
    
    public static function RenderManyFromDb($values){
        $output = [];
        foreach($values as $fieldData){
            array_push($output, self::RenderFromDb($fieldData));
        }
        return $output;
    }
    
    public static function RenderFromDb($values){
        $class = self::BuildClassFromArray('Episode', $values);
        return $class;
    }

    public static function RenderManyFromClient($data){
        return self::RenderManyFromDb($data);
    }

    public static function GetMapAsColumns(){
        return self::ContructColumnsFromMap(self::dbMap);
    }
}
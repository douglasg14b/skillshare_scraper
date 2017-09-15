<?php 

class Downloader {
    
    public function Download($source, $destination, $number, $name){
        ini_set('max_execution_time', 300);
        $source = "https://udso-a.akamaihd.net/3695997568001/3695997568001_4762494644001_3752552069001.mp4?pubId=3695997568001&videoId=3752552069001";
        $destination = "C:\Users\Administrator\Downloads";
        $number = "1";
        $name = "Livestream Lecture";

        $fullPath = $destination.'/'.$number.$name.'.mp4';
        //ini_set('memory_limit', '4095M'); // 4 GBs minus 1 MB
        $chunkSize = 1024*1024; //1 MiB

        $file = fopen($source, 'rb');
        if($file){
            $destiantionFile = fopen($fullPath, 'wb');
            if($destiantionFile){
                while(!feof($file)){
                    fwrite($destiantionFile, fread($file, $chunkSize), $chunkSize);
                }
            }
        }

        if ($file) {
            fclose($file);
        }
        if ($destiantionFile) {
            fclose($destiantionFile);
        }        
    }
}
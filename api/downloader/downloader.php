<?php 
include_once '/../helper.php';
include_once '/../../setters.php';

class Downloader {
    function __construct($source){
        $this->lastReported = round(microtime(true) * 1000);
        $this->setter = new Setters();
        $this->totalSize = curl_get_file_size($source);
        $this->SetProgressTotalSize($this->totalSize);
    }

    var $totalSize;
    var $progressId;
    var $setter;
    var $lastReported; //Time when status was last reported, to minimize heavy DB impact
    var $lastReportedLocation; //Last reported location, used to get download speed
    
    public function Download($source, $destination, $name){
        //ini_set('max_execution_time', 300);
        $fullPath = $destination.'/'.$name;
        //ini_set('memory_limit', '4095M'); // 4 GBs minus 1 MB
        $chunkSize = $this->GetChunkSize($this->totalSize);

        $this->EnsureDirExists($destination);
        $this->RemoveFileIfExists($fullPath);        

        $file = fopen($source, 'rb');
        if($file){
            $destiantionFile = fopen($fullPath, 'wb');
            if($destiantionFile){
                while(!feof($file)){
                    fwrite($destiantionFile, fread($file, $chunkSize), $chunkSize);
                    $this->ReportProgress(ftell($file));
                }
            }
        }

        $this->ReportProgress(ftell($file), true);

        if ($file) {
            fclose($file);
        }
        if ($destiantionFile) {
            fclose($destiantionFile);
        }      
    }

    private function GetChunkSize($fileSize){
        if($fileSize < 1024){ //<1KB
            return 512;
        } else if($fileSize < 1024 * 8){ // <8KB
            return 1024 * 4; //4KB
        } else if($fileSize < 1024 * 1024){ // <1MB
            return 1024 * 8; //8KB chunks for everything under 1MB
        } else if($fileSize < 1024 * 1024 * 4){ //4MB
            return 1024 * 1024 * 2; //2MB
        } else if($fileSize < 1024 * 1024 * 8){ //8MB
            return 1024 * 1024 * 4; //4MB
        } else {
            return 1024 * 1024 * 8; //8MB
        }
    }

    private function RemoveFileIfExists($path){
        if(file_exists($path)){
            unlink($path);
        }
    }

    private function EnsureDirExists($path){  
        if(!is_dir($path)){
            mkdir($path, 0777, true);
        }
    }

    private function SetProgressTotalSize($totalBytes){
        $this->progressId = $this->setter->insertRow('download_progress', ['total_size' => $totalBytes]);
    }

    private function ReportProgress($bytesRead, $done = false){
        $now = round(microtime(true) * 1000);
        if($now - $this->lastReported > 500 || $done){
            $this->setter->updateRow($this->progressId, 'id', 'download_progress', ['downloaded' => $bytesRead]);
            $this->lastReported = round(microtime(true) * 1000);
        }
    }
}
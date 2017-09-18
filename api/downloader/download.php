<?php
include_once 'Downloader.php';
include_once '/../../config.php';
ignore_user_abort(true);
set_time_limit(3000);
ob_start();


$rest_json = file_get_contents("php://input");
$_POST = json_decode($rest_json, true);

$destination = BASE_DOWNLOAD_PATH.$_POST['path'];
$name = $_POST['filename'];
$source = $_POST['url'];

$downloader = new Downloader($source);

$progressId = $downloader->progressId;

print_r(json_encode([
    'progressId' => $progressId
]));

header('Connection: close');
header('Content-Length: '.ob_get_length());
ob_end_flush();
ob_flush();
flush();

$downloader->Download($source, $destination, $name);
return;
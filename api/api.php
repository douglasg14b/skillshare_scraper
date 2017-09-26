<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require_once '..\vendor\autoload.php';
require_once "..\assets\MysqliDb\MysqliDb.php";
require_once "..\setters.php";
require_once "..\getters.php";
require_once "..\CourseProcessor.php";
require_once "downloader/Downloader.php";


$configuration = [
    'settings' => [
        'displayErrorDetails' => true,
        'determineRouteBeforeAppMiddleware' => true,
    ],
];

$c = new \Slim\Container($configuration);

$app = new \Slim\App($c);

$app->get('/test', function($request, $response, $args){
    $data = Getters::GetCourse(640346588);
    $data->SortTags();
    //$downloader = new Downloader();
    /*$downloader->Download(
        "https://udso-a.akamaihd.net/3695997568001/3695997568001_4762494644001_3752552069001.mp4?pubId=3695997568001&videoId=3752552069001",
        "C:\Users\Administrator\Downloads",
        "1",
        "Livestream Lecture");*/
    return formatResponse($response, 'success', '', $data); 
});

//Gets the active status of the episode
$app->get('/episode/{id}/active', function($request, $response, $args){
    $id = $args['id'];

    $getter = new Getters();
    $downloaded = $getter->GetValue('download_queue_episodes', ['episode_id' => $id], 'downloaded');
    $assigned = $getter->GetValue('download_queue_episodes', ['episode_id' => $id], 'assigned');
    $data = [
        'assigned' => $assigned,
        'downloaded' => $downloaded
    ];

    return formatResponse($response, 'success', 'success', $data);
});

//Gets the active status of the attachment
$app->get('/attachment/{id}/active', function($request, $response, $args){
    $id = $args['id'];

    $getter = new Getters();
    $downloaded = $getter->GetValue('download_queue_attachments', ['attachment_id' => $id], 'downloaded');
    $assigned = $getter->GetValue('download_queue_attachments', ['attachment_id' => $id], 'assigned');
    $data = [
        'assigned' => $assigned,
        'downloaded' => $downloaded
    ];

    return formatResponse($response, 'success', 'success', $data);
});
//Sets the episode as unassign in the queue
$app->post('/episode/{id}/unassign', function($request, $response, $args){
    $id = $args['id'];

    $setter = new Setters();
    $setter->updateRow($id, 'episode_id', 'download_queue_episodes', ['assigned' => false]);

    return formatResponse($response, 'success', 'success');
});

//Sets the attachment as unassign in the queue
$app->post('/attachment/{id}/unassign', function($request, $response, $args){
    $id = $args['id'];

    $setter = new Setters();
    $setter->updateRow($id, 'attachment_id', 'download_queue_attachments', ['assigned' => false]);

    return formatResponse($response, 'success', 'success');
});

//Sets the episode as assigned in the queue
$app->post('/episode/{id}/assigned', function($request, $response, $args){
    $id = $args['id'];

    $setter = new Setters();
    $setter->updateRow($id, 'episode_id', 'download_queue_episodes', ['assigned' => true]);

    return formatResponse($response, 'success', 'success');
});

//Sets the attachment as assigned in the queue
$app->post('/attachment/{id}/assigned', function($request, $response, $args){
    $id = $args['id'];

    $setter = new Setters();
    $setter->updateRow($id, 'attachment_id', 'download_queue_attachments', ['assigned' => true]);

    return formatResponse($response, 'success', 'success');
});

//Sets the episode as downloaded in the queue
$app->post('/episode/{id}/downloaded', function($request, $response, $args){
    $parsed = $request->getParsedBody();
    $path = $parsed['path'];
    $id = $args['id'];
    if(!$path){
        return formatBadRequestResponse($request, 'No path supplied');
    }
    $setter = new Setters();
    $setter->updateRow($id, 'episode_id', 'download_queue_episodes', ['downloaded' => true, 'path' => $path]);

    return formatResponse($response, 'success', 'success');
});

//Sets the attachment as downloaded in the queue
$app->post('/attachment/{id}/downloaded', function($request, $response, $args){
    $parsed = $request->getParsedBody();
    $path = $parsed['path'];
    $id = $args['id'];
    if(!$path){
        return formatBadRequestResponse($request, 'No path supplied');
    }
    $setter = new Setters();
    $setter->updateRow($id, 'attachment_id', 'download_queue_attachments', ['downloaded' => true, 'path' => $path]);

    return formatResponse($response, 'success', 'success');
});

//Sets the course as downlaoded and sets the metadata
$app->post('/course/{courseId}/downloaded', function($request, $response, $args){
    $id = $id = $args['courseId'];

    $getter = new Getters();
    $course = $getter->GetCourse($id);
    $partialPath = $course->relativePath;

    $setter = new Setters();
    $setter->updateRow($id, 'course_id', 'courses', ['downloaded' => true, 'path' => $partialPath]);
    $course = $getter->GetCourse($id);


    $courseMeta = json_encode($course, JSON_NUMERIC_CHECK | JSON_PRETTY_PRINT);
    $destiantionFile = fopen(BASE_DOWNLOAD_PATH.$partialPath.'meta.json', 'wb');
    fwrite($destiantionFile, $courseMeta);
    fclose($destiantionFile);


    return formatResponse($response, 'success', 'success');
});

$app->get('/downloads/{id}/progress', function($request, $response, $args){
    $id = $args['id'];
    $getter = new Getters();
    $data = $getter->Get('download_progress', ['id' => $id], ['total_size as totalSize','downloaded']);
    if($data){
        return formatResponse($response, 'success', 'success', $data[0]); 
    } else {
        return formatResponse($response, 'success', 'failure', ['totalSize' => 99999, 'downloaded' => 0 ]); 
    }
});

$app->get('/course/{courseId}/details', function($request, $response, $args){
    $id = $args['courseId'];
    if(Setters::rowExists("courses", ["course_id" => $id])){
        $data = Getters::GetCourse($id);
        return formatResponse($response, 'success', '', $data); 
    }
    return formatNotFoundResponse($response, 'Course not found');
});

$app->get('/delay', function($request, $response, $args){
    sleep(5);
    return formatResponse($response, 'success', 'sucess stuff'); 
});

//Adds a new course and it's link to the DB
$app->get('/courses/next', function($request, $response, $args){
    $db = getDBInstance();

    $db->having('SUM(downloaded) < COUNT(course_id)');
    $db->having('SUM(assigned) < COUNT(course_id)');
    $db->groupBy('course_id');
    $id = $db->getValue('download_queue_episodes', 'course_id');

    if($id){
        return formatResponse($response, 'success', 'Success', $id);
    } else {
        $db = getDBInstance();
        return formatServerErrorResponse($response, $db->getLastQuery());
    }
});

//Adds a new course and it's link to the DB
$app->post('/course/new', function($request, $response, $args){
    $parsed = $request->getParsedBody();
    if(!array_key_exists("link", $parsed)){
        return formatBadRequestResponse($response, "No link supplied");
    }
    if(!array_key_exists("name", $parsed)){
        return formatBadRequestResponse($response, "No name supplied");
    }
    if(!array_key_exists("courseId", $parsed)){
        return formatBadRequestResponse($response, "No course Id supplied");
    }

    $link = $parsed['link'];
    $name = $parsed['name'];
    $courseId = $parsed['courseId'];

    if(!Setters::rowExists("courses", ["course_id" => $courseId])){
        $id = Setters::insertRow("courses", [
            "course_id" => $courseId,
            "name" => $name,
            "link" => $link
        ]);
        if($id){
            return formatResponse($response, 'success', 'Added course', $id); 
        } else {
            $db = getDBInstance();
            $error = $db->getLastError();
            return formatServerErrorResponse($response, $error);
        }     
    }
    return formatConflictResponse($response, "Course Already Exists");
});

$app->post('/course/{id}/locked', function($request, $response, $args){

    $id = $args['id'];
    $result = Setters::updateRow($id, 'course_id', 'courses', ['locked' => true]);
    if(!$result){
        $db = getDBInstance();
        $error = $db->getLastError();
        return formatServerErrorResponse($response, $error);     
    }
    return formatResponse($response, 'success', 'Marked as locked', $id);
});

//Adds course data
$app->post('/course/{id}/data', function($request, $response, $args){
    $parsed = $request->getParsedBody();
    if(empty($parsed)){
        return formatBadRequestResponse($response, "No data supplied");
    }

    $result = CourseProcessor::ProcessCourse($parsed);
    if($result['status'] == 'success'){
        return formatResponse($response, 'success', 'Sucessfully inserted', $parsed);
    } else if($result['status'] == 'duplicate') {
        return formatConflictResponse($response, 'Course Already Exists');
    } else {
        return formatServerErrorResponse($response, $result['message']);
    }

});

function formatConflictResponse($response, $message){
    return $response->withStatus(409)
                    ->withJson(["message" => $message]);
            
}

function formatServerErrorResponse($response, $message){
    return $response->withStatus(500)
                    ->withJson(["message" => $message]);
            
}

function formatNotFoundResponse($response, $message){
    return $response->withStatus(404)
                    ->withJson(["message" => $message]);
            
}

function formatBadRequestResponse($response, $message){
    return $response->withStatus(400)
                    ->withJson(["message" => $message]);
            
}

function formatNotAuthorizedResponse($response, $message){
    return $response->withStatus(401)
                    ->withJson(["message" => $message]);
            
}

function formatResponse($response, $status, $message, $data = []){
    $newResponse = $response->withJson([
        "status" => $status,
        "message" => $message,
        "data" => $data
    ], 200, JSON_NUMERIC_CHECK | JSON_PRETTY_PRINT);
    
    return $newResponse;
}

/* Prevents creating more DB connectons than needed */
function getDBInstance(){
    $db = MysqliDb::getInstance();
    
    if(!isset($db)){
        $db = new MysqliDb(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    }
    return $db;
}

$app->run();
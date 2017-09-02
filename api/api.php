<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require_once '..\vendor\autoload.php';
require_once "..\assets\MysqliDb\MysqliDb.php";
require_once "..\setters.php";
require_once "..\CourseProcessor.php";


$configuration = [
    'settings' => [
        'displayErrorDetails' => true,
        'determineRouteBeforeAppMiddleware' => true,
    ],
];

$c = new \Slim\Container($configuration);

$app = new \Slim\App($c);

//Adds a new course and it's link to the DB
$app->get('/test', function($request, $response, $args){
    return formatResponse($response, 'success', 'sucess stuff'); 
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

//Adds course data
$app->post('/course/{id}/data', function($request, $response, $args){
    $parsed = $request->getParsedBody();
    if(!array_key_exists("data", $parsed)){
        return formatBadRequestResponse($response, "No data supplied");
    }

    $data = $parsed['data'];
    $result = CourseProcessor::ProcessCourse($data);
    if($result['status'] == 'success'){
        return formatResponse($response, 'success', 'Valid Course', $data);
    } else {
        formatServerErrorResponse($response, $result['message']);
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
    ], 200, JSON_NUMERIC_CHECK);
    
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
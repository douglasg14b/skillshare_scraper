<?php
require_once "assets\MysqliDb\MysqliDb.php";
require_once "config.php";

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

    /* Prevents creating more DB connectons than needed */
    private static function getDBInstance(){
        $db = MysqliDb::getInstance();
        
        if(!isset($db)){
            $db = new MysqliDb(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        }
        return $db;
    }    
}
<?php
require_once "assets\MysqliDb\MysqliDb.php";
require_once "config.php";


/**
 * Description of RubricSetters
 *
 * @author Doug
 */
class Setters {
    
    /*
     * Updates multiple seperate rows
     * @param $data The data formatted like $id => rowData
     * @param $idColumnName The name of the id column ie. field_id
     * @param $tableName The table name the rows are contained in
     */
    public static function updateRows($data, $idColumnName, $tableName, $transaction){
        $db = self::getDBInstance();        
        $rowsUpdated = 0;
        if($transaction){
            $db->startTransaction();  
        }
        
        foreach($data as $id => $itemData){
            if(self::updateRow($id, $idColumnName, $tableName, $itemData)){
                $rowsUpdated++;
                continue;                
            }
            if($transaction){
                $db->rollback();
            }
            return false;
        }
        if($transaction){
            $db->commit();
        }
        return true; 
    }

    public static function rowExists($tableName, $criteria){
        $db = self::getDBInstance();
        foreach($criteria as $column => $value){
            $db->where($column, $value);
        }
        if($db->get($tableName, null, '*')){
            return true;
        } else {
            return false;
        }
    }

    public static function updateOrInsertRow($tableName, $data, $criteria){
        $db = self::getDBInstance();
        if(self::rowExists($tableName, $criteria)){
            return self::updateRowMultipleCriteria($tableName, $data, $criteria);
        } else {
            return self::insertRow($tableName, $data);
        }
    }

    /* 
     * Updates a single row 
     * @param string $tableName The name of the table
     * @param $data The associative array of columnName => value
     * @param $criteria The associative array of columnName => value for where clauses
     */
    public static function updateRowMultipleCriteria($tableName, $data, $criteria){
        $db = self::getDBInstance();
        foreach($criteria as $column => $value){
            $db->where($column, $value);
        }
        if($db->update($tableName, $data)){
            return true;
        } else {
            return false;
        }
    }
    
    /* 
     * Updates a single row 
     * @param int $id Primary key for item
     * @param string $idColumnName The column name for the key
     * @param string $tableName The name of the table
     * @param $data The associative array of columnName => value
     */
    public static function updateRow($id, $idColumnName, $tableName, $data){
        $db = self::getDBInstance();
        $db->where($idColumnName, $id);
        if($db->update($tableName, $data)){
            return true;
        } else {
            return false;
        }
    }
    
    public static function insertRow($tableName, $data){
        $db = self::getDBInstance();
        $id = $db->insert($tableName, $data);
        return $id;
    }
    
    public static function insertRows($tableName, $data){
        $db = self::getDBInstance();
        $ids = $db->insertMulti($tableName, $data);
        return $ids;
    }    
    
    public static function insertSimilarRows($tableName, $data, $keys){
        $db = self::getDBInstance();
        $ids = $db->insertMulti($tableName, $data, $keys);
        return $ids;
    }

    public static function deleteThenInsertRows($table, $column, $condition, $data){
        $db = self::getDBInstance();
        $db->startTransaction();

        try {
            $db->where($column, $condition);
            $db->delete($table);

            self::insertRows($table, $data);
            $db->commit();
            return true;
        } catch(Exception $e){
            $db->rollback();
            return false;
        }
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

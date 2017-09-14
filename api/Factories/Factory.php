<?php

require_once '/../Models/Attachment.php';
require_once '/../Models/Course.php';
require_once '/../Models/Episode.php';
require_once '/../Models/Author.php';
require_once '/../Models/Project.php';
require_once '/../Models/Tag.php';

/**
 * Description of Factory
 *
 * @author doug.gaskell
 */
class Factory {
    
    protected static function BuildClassFromArray($className, $valuesArray, $map = []){
        $classInstance = new $className;
        $reflection = new ReflectionClass($classInstance);
        $classProps = $reflection->getProperties(ReflectionProperty::IS_PUBLIC);
        
        foreach($classProps as $property){
            $refName = $property->getName();
            
            if(array_key_exists($refName, $map)){
                $refName = $map[$refName];
            }

            if(array_key_exists($refName, $valuesArray)){
                $property->setValue($classInstance, $valuesArray[$refName]);
            }
        }
        return $classInstance;
    }

    protected static function MapObjectToArray($object, $map){
        $mapped = [];
        foreach($map as $sourceProp => $destination){
            if(property_exists($object, $sourceProp)){
                $mapped[$destination] = $object->$sourceProp;
            } else {
                throw new InvalidArgumentException('Factory: Expected object property does not exist: '.$sourceProp);
            }
        }
        return $mapped;
    }

    protected static function GetColumnMapForType($columns, $type){
        $columnMap = [];
        foreach($columns as $prop => $column){
            if($column[$type] === true){
                $columnMap[$prop] = $column['column'];
            }
        }
        return $columnMap;
    }

    //Constructs the column mapping from an array of property names and DB fields
    protected static function ContructColumnsFromMap($columnMap){
        $output = [];
        foreach($columnMap as $propName => $dbNames){
            if(count($dbNames) > 1){
                array_push($output, $dbNames[0].'.'.$dbNames[1].' as '.$propName);
            } else {
                array_push($output, $dbNames[0].' as '.$propName);
            }
            
        }
        return $output;
    }    
}
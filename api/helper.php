<?php

function Filename($string){
    $string = Unaccent($string);
    $string = str_replace(":", "-", $string);
    $string = str_replace("!", "", $string);
    $string = str_replace("\"", "", $string);
    $string = str_replace("/", "", $string);
    $string = str_replace("\\", "", $string);
    $string = str_replace("?", "", $string);
    $string = str_replace("*", "", $string);
    $string = str_replace("<", "(", $string);
    $string = str_replace(">", ")", $string);
    $string = str_replace("|", "-", $string);
    $string = str_replace("+", "-", $string);
    $string = str_replace("#", "", $string);
    $string = str_replace("", "", $string);

    $string = str_replace("\t", "", $string);
    $string = str_replace("\b", "", $string);
    $string = str_replace("\n", "", $string);
    return $string;
}

function Slug($string, $slug = '-', $extra = null){
    return strtolower(trim(preg_replace('~[^0-9a-z' . preg_quote($extra, '~') . ']+~i', $slug, Unaccent($string)), $slug));        
}

function Unaccent($string){
    $string = html_entity_decode(preg_replace('~&([a-z]{1,2})(?:acute|caron|cedil|circ|grave|lig|orn|ring|slash|tilde|uml);~i', '$1', $string), ENT_QUOTES, 'UTF-8');
    return $string;
}

/**
 * Returns the size of a file without downloading it, or -1 if the file
 * size could not be determined.
 *
 * @param $url - The location of the remote file to download. Cannot
 * be null or empty.
 *
 * @return The size of the file referenced by $url, or -1 if the size
 * could not be determined.
 */
function curl_get_file_size($url) {
  // Assume failure.
  $result = -1;

  $curl = curl_init( $url );

  // Issue a HEAD request and follow any redirects.
  curl_setopt( $curl, CURLOPT_NOBODY, true );
  curl_setopt( $curl, CURLOPT_HEADER, true );
  curl_setopt( $curl, CURLOPT_RETURNTRANSFER, true );
  curl_setopt( $curl, CURLOPT_FOLLOWLOCATION, true );

  $data = curl_exec( $curl );
  curl_close( $curl );

  if( $data ) {
    $content_length = "unknown";
    $status = "unknown";

    if( preg_match( "/^HTTP\/1\.[01] (\d\d\d)/", $data, $matches ) ) {
      $status = (int)$matches[1];
    }

    if( preg_match( "/Content-Length: (\d+)/", $data, $matches ) ) {
      $content_length = (int)$matches[1];
    }

    // http://en.wikipedia.org/wiki/List_of_HTTP_status_codes
    if( $status == 200 || ($status > 300 && $status <= 308) ) {
      $result = $content_length;
    }
  }

  return $result;
}
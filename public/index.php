<?php
ini_set('memory_limit', -1);

//PHP_EOL !== "\n" or define('MANAPHP_COROUTINE', true);

require dirname(__DIR__) . '/vendor/autoload.php';

$app = new \App\Application();
$app->main();
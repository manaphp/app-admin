<?php
declare(strict_types=1);

return [
    'ManaPHP\Security\CryptInterface'       => ['master_key' => env('MASTER_KEY', 'dev')],
    'ManaPHP\Http\SessionInterface'         => ['class'  => 'ManaPHP\Http\Session\Adapter\Redis',
                                                'ttl'    => seconds('1d'),
                                                'params' => ['path' => '/']],
    'ManaPHP\Http\RouterInterface'          => ['prefix' => ''],
    'ManaPHP\Identifying\IdentityInterface' => 'ManaPHP\Identifying\Identity\Adapter\Session',
    'ManaPHP\Mailing\MailerInterface'       => 'ManaPHP\Mailing\Mailer\Adapter\File',
    'ManaPHP\Http\RequestHandlerInterface'  => [
        'middlewares' => [
            \ManaPHP\Http\Middlewares\RequestIdMiddleware::class,
            \ManaPHP\Http\Middlewares\AuthorizationMiddleware::class,
            \ManaPHP\Http\Middlewares\CorsMiddleware::class,
        ],
    ],
];
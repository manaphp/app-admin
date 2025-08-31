<?php

declare(strict_types=1);

namespace App\Controllers;

use ManaPHP\Http\Controller\Attribute\Authorize;
use ManaPHP\Http\Router\Attribute\GetMapping;
use ManaPHP\Http\Router\Attribute\RequestMapping;
use ManaPHP\Http\Router\Attribute\SseGetMapping;
use ManaPHP\Http\SseEvent;
use function sleep;

#[Authorize]
#[RequestMapping('/test')]
class TestController extends Controller
{
    #[GetMapping]
    public function indexAction(): void
    {

    }

    #[Authorize(Authorize::GUEST)]
    #[GetMapping]
    public function chunkAction(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->response->write("chunk $i\n");
            sleep(1);
        }
    }

    #[Authorize(Authorize::GUEST)]
    #[GetMapping]
    public function sseAction(): void
    {
        $this->response->setHeader('Content-Type', 'text/event-stream');
        $this->response->setHeader('Connection', 'keep-alive');
        $this->response->setHeader('Cache-Control', 'no-cache');

        for ($i = 0; $i < 10; $i++) {
            $this->response->write(new SseEvent(['id' => $i, 'data' => "hello $i"]));
            sleep(1);
        }
    }
}

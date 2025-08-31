<?php

declare(strict_types=1);

namespace App\Controllers;

use ManaPHP\Di\Attribute\Autowired;
use ManaPHP\Http\Controller\Attribute\Authorize;
use ManaPHP\Http\Metrics\ExporterInterface;
use ManaPHP\Http\ResponseInterface;
use ManaPHP\Http\Router\Attribute\GetMapping;
use ManaPHP\Http\Router\Attribute\RequestMapping;
use ManaPHP\Viewing\View\Attribute\ViewMapping;

#[Authorize(Authorize::USER)]
#[RequestMapping('')]
class IndexController extends Controller
{
    #[Autowired] protected ExporterInterface $exporter;

    #[ViewMapping('/')]
    public function indexAction(): void
    {

    }

    #[GetMapping]
    public function metricsAction(): ResponseInterface
    {
        return $this->exporter->export();
    }
}

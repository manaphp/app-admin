<?php

declare(strict_types=1);

namespace App\Listeners;

class AdminActionLogListenerContext
{
    public bool $logged = false;
    public string $handler = '';
    public bool $invoking = false;
}

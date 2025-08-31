<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Entities\AdminActionLog;
use App\Repositories\AdminActionLogRepository;
use ManaPHP\Coroutine\ContextAware;
use ManaPHP\Coroutine\ContextManagerInterface;
use ManaPHP\Db\Event\DbExecuting;
use ManaPHP\Di\Attribute\Autowired;
use ManaPHP\Eventing\Attribute\Event;
use ManaPHP\Helper\Arr;
use ManaPHP\Helper\SuppressWarnings;
use ManaPHP\Http\CookiesInterface;
use ManaPHP\Http\Event\RequestInvoked;
use ManaPHP\Http\Event\RequestInvoking;
use ManaPHP\Http\RequestInterface;
use ManaPHP\Identifying\IdentityInterface;
use function json_stringify;
use function str_contains;

class AdminActionLogListener implements ContextAware
{
    #[Autowired] protected ContextManagerInterface $contextManager;
    #[Autowired] protected IdentityInterface $identity;
    #[Autowired] protected RequestInterface $request;
    #[Autowired] protected CookiesInterface $cookies;
    #[Autowired] protected AdminActionLogRepository $adminActionLogRepository;

    public function getContext(): AdminActionLogListenerContext
    {
        return $this->contextManager->getContext($this);
    }

    protected function getTag(): int
    {
        foreach ($this->request->all() as $k => $v) {
            if (is_numeric($v)) {
                if ($k === 'id') {
                    return (int)$v;
                } elseif (str_ends_with($k, '_id')) {
                    return (int)$v;
                }
            }
        }

        return 0;
    }

    public function onRequestInvoking(#[Event] RequestInvoking $event): void
    {
        $context = $this->getContext();

        $context->invoking = true;
        $context->handler = $event->controller . '::' . $event->action;
    }

    public function onRequestInvoked(#[Event] RequestInvoked $event): void
    {
        SuppressWarnings::unused($event);

        $context = $this->getContext();

        $context->invoking = false;
    }

    public function onDbExecuting(#[Event] DbExecuting $event): void
    {
        SuppressWarnings::unused($event);

        $context = $this->getContext();
        if ($context->logged) {
            return;
        }

        if ($context->invoking && str_contains($context->handler, '\\Areas\\Admin\\')) {
            $this->logAdminAction();
        }
    }

    public function logAdminAction(): void
    {
        $context = $this->getContext();

        if ($context->logged) {
            return;
        }

        $context->logged = true;

        $data = Arr::except($this->request->all(), ['_url']);
        if (isset($data['password'])) {
            $data['password'] = '*';
        }
        unset($data['ajax']);

        $adminActionLog = new AdminActionLog();

        $adminActionLog->admin_id = $this->identity->isGuest() ? 0 : $this->identity->getId();
        $adminActionLog->admin_name = $this->identity->isGuest() ? '' : $this->identity->getName();
        $adminActionLog->client_ip = $this->request->ip();
        $adminActionLog->method = $this->request->method();
        $adminActionLog->url = $this->request->path();
        $adminActionLog->tag = $this->getTag() & 0xFFFFFFFF;
        $adminActionLog->data = json_stringify($data);
        $adminActionLog->handler = $context->handler;
        $adminActionLog->client_udid = $this->cookies->get('CLIENT_UDID');

        $this->adminActionLogRepository->create($adminActionLog);
    }
}

<?php

declare(strict_types=1);

namespace App\Areas\Admin\Controllers;

use App\Controllers\Controller;
use App\Entities\AdminActionLog;
use App\Repositories\AdminActionLogRepository;
use ManaPHP\Di\Attribute\Autowired;
use ManaPHP\Http\AuthorizationInterface;
use ManaPHP\Http\Controller\Attribute\Authorize;
use ManaPHP\Http\Router\Attribute\GetMapping;
use ManaPHP\Http\Router\Attribute\RequestMapping;
use ManaPHP\Persistence\Page;
use ManaPHP\Persistence\Restrictions;
use ManaPHP\Query\Paginator;
use ManaPHP\Viewing\View\Attribute\ViewGetMapping;

#[RequestMapping('/admin/action-log')]
class ActionLogController extends Controller
{
    #[Autowired] protected AdminActionLogRepository $adminActionLogRepository;
    #[Autowired] protected AuthorizationInterface $authorization;

    #[Authorize]
    #[ViewGetMapping]
    public function indexAction(int $page = 1, int $size = 10): Paginator
    {
        $restrictions = Restrictions::of(
            $this->request->all(),
            ['admin_name', 'handler', 'client_ip', 'created_time@=', 'tag']
        );

        $orders = ['id' => SORT_DESC];
        return $this->adminActionLogRepository->paginate($restrictions, [], $orders, Page::of($page, $size));
    }

    #[Authorize(Authorize::USER)]
    #[GetMapping]
    public function detailAction(int $id): AdminActionLog|string
    {
        $adminActionLog = $this->adminActionLogRepository->get($id);
        if ($adminActionLog->admin_id === $this->identity->getId() || $this->authorization->isAllowed(__METHOD__)) {
            return $adminActionLog;
        } else {
            return '没有权限';
        }
    }

    #[Authorize(Authorize::USER)]
    #[ViewGetMapping]
    public function latestAction(int $page = 1, int $size = 10): Paginator
    {
        $restrictions = Restrictions::of($this->request->all(), ['handler', 'client_ip', 'created_time@=', 'tag']);
        $restrictions->eq('admin_id', $this->identity->getId());

        $orders = ['id' => SORT_DESC];
        return $this->adminActionLogRepository->paginate($restrictions, [], $orders, Page::of($page, $size));
    }
}

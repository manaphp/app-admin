<?php

declare(strict_types=1);

namespace App\Areas\Menu\Controllers;

use App\Areas\Menu\Entities\Group;
use App\Areas\Menu\Repositories\GroupRepository;
use App\Controllers\Controller;
use ManaPHP\Di\Attribute\Autowired;
use ManaPHP\Http\Controller\Attribute\Authorize;
use ManaPHP\Http\Router\Attribute\GetMapping;
use ManaPHP\Http\Router\Attribute\PostMapping;
use ManaPHP\Http\Router\Attribute\RequestMapping;
use ManaPHP\Persistence\Restrictions;
use ManaPHP\Viewing\View\Attribute\ViewGetMapping;

#[Authorize]
#[RequestMapping('/menu/group')]
class GroupController extends Controller
{
    #[Autowired] protected GroupRepository $groupRepository;

    #[ViewGetMapping]
    public function indexAction(): array
    {
        $restrictions = Restrictions::of($this->request->all(), ['group_id']);
        $orders = ['display_order' => SORT_DESC, 'group_id' => SORT_ASC];
        return $this->groupRepository->all($restrictions, [], $orders);
    }

    #[GetMapping]
    public function listAction(): array
    {
        return $this->groupRepository->all([], ['group_id', 'group_name']);
    }

    #[PostMapping]
    public function createAction(): Group
    {
        return $this->groupRepository->create($this->request->all());
    }

    #[PostMapping]
    public function editAction(): Group
    {
        return $this->groupRepository->update($this->request->all());
    }

    #[PostMapping]
    public function deleteAction(int $group_id): ?Group
    {
        return $this->groupRepository->deleteById($group_id);
    }
}

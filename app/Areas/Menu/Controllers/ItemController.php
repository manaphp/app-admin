<?php

declare(strict_types=1);

namespace App\Areas\Menu\Controllers;

use App\Areas\Menu\Entities\Item;
use App\Areas\Menu\Repositories\ItemRepository;
use App\Controllers\Controller;
use App\Interceptors\LogInterceptor;
use ManaPHP\Di\Attribute\Autowired;
use ManaPHP\Helper\Str;
use ManaPHP\Http\AuthorizationInterface;
use ManaPHP\Http\Controller\Attribute\Authorize;
use ManaPHP\Http\ControllersInterface;
use ManaPHP\Http\Router\Attribute\PostMapping;
use ManaPHP\Http\Router\Attribute\RequestMapping;
use ManaPHP\Persistence\Restrictions;
use ManaPHP\Viewing\View\Attribute\ViewGetMapping;
use ManaPHP\Viewing\View\Attribute\ViewMappingInterface;
use ReflectionAttribute;
use ReflectionClass;
use ReflectionMethod;
use function basename;
use function is_string;
use function method_exists;
use function str_contains;
use function str_starts_with;

#[LogInterceptor]
#[Authorize]
#[RequestMapping('/menu/item')]
class ItemController extends Controller
{
    #[Autowired] protected ItemRepository $itemRepository;
    #[Autowired] protected ControllersInterface $controllers;
    #[Autowired] protected AuthorizationInterface $authorization;

    #[ViewGetMapping]
    public function indexAction(int $group_id = 0): array
    {
        $restrictions = Restrictions::of($this->request->all(), ['group_id']);
        if ($group_id > 0) {
            $orders = ['display_order' => SORT_DESC, 'item_id' => SORT_ASC];
        } else {
            $orders = ['updated_time' => SORT_DESC, 'item_id' => SORT_ASC];
        }
        return $this->itemRepository->all($restrictions, [], $orders);
    }

    #[PostMapping]
    public function createAction(): Item
    {
        return $this->itemRepository->create($this->request->all());
    }

    #[LogInterceptor]
    #[PostMapping]
    public function editAction(): Item
    {
        return $this->itemRepository->update($this->request->all());
    }

    #[PostMapping]
    public function deleteAction(int $item_id): ?Item
    {
        return $this->itemRepository->deleteById($item_id);
    }

    #[PostMapping]
    public function scanAction(): void
    {
        $items = [];
        foreach ($this->itemRepository->all() as $item) {
            $items[$item->url] = $item;
        }

        foreach ($this->controllers->getControllers() as $controller) {
            $rClass = new ReflectionClass($controller);
            if (($attribute = $rClass->getAttributes(RequestMapping::class, ReflectionAttribute::IS_INSTANCEOF)[0] ??
                    null) !== null
            ) {
                /** @var RequestMapping $requestMapping */
                $requestMapping = $attribute->newInstance();
                $prefix = $requestMapping->getPath();
            } else {
                $prefix = null;
            }

            $action = 'indexAction';
            if (!method_exists($controller, $action)) {
                continue;
            }

            $rMethod = new ReflectionMethod($controller, $action);

            if (($attribute = $rMethod->getAttributes(
                    ViewMappingInterface::class,
                    ReflectionAttribute::IS_INSTANCEOF
                )[0]
                    ?? null) === null
            ) {
                continue;
            }

            /** @var ViewMappingInterface $viewMapping */
            $viewMapping = $attribute->newInstance();
            $path = $viewMapping->getPath();
            if ($path === null) {
                $path = Str::hyphen(basename($rMethod->getName(), 'Action'));
            } elseif (is_string($path)) {
                if (str_contains($path, '{')) {
                    continue;
                }
            } else {
                continue;
            }

            if (!str_starts_with($path, '/')) {
                $path = $prefix ? ($prefix . '/' . $path) : $path;
            }

            if (!isset($items[$path])) {
                $item = new Item();

                $item->item_name = '';
                $item->group_id = 0;
                $item->display_order = 0;
                $item->url = $path;
                $item->icon = 'el-icon-arrow-right';
                $item->permission_code = $this->authorization->getPermission($controller, $rMethod->getName());

                $this->itemRepository->create($item);
            }
        }
    }
}

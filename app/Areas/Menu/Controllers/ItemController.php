<?php
namespace App\Areas\Menu\Controllers;

use App\Areas\Menu\Models\Item;
use ManaPHP\Mvc\Controller;

class ItemController extends Controller
{
    public function indexAction()
    {
        return Item::viewOrAll(['group_id'], ['order' => ['group_id' => SORT_ASC, 'display_order' => SORT_DESC, 'item_id' => SORT_ASC]]);
    }

    public function createAction()
    {
        return Item::viewOrCreate();
    }

    public function editAction()
    {
        return Item::viewOrUpdate();
    }

    public function deleteAction()
    {
        return Item::viewOrDelete();
    }
}
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\TelegramService;

class Department extends Controller
{


    public function create(Request $request, TelegramService $telegram)
    {
        $telegram->sendMessage(
            "🏢 <b>Phòng ban mới được tạo</b>\n\n".
            "Tên: test\n".
            "Mã: code \n".
            "Người tạo: trọng\n"
        );

        return response()->json(200);
    }
}

<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;

class TelegramService
{
    public function sendMessage(string $message): bool
    {
        $url = "https://api.telegram.org/bot".config('services.telegram.token')."/sendMessage";
		$user = User::find(1);

		$response = Http::post($url, [
            'chat_id'    => config('services.telegram.chat_id'),
            'text'       => $message,
            'parse_mode' => 'HTML'
        ]);

        return $response->successful();
    }
}
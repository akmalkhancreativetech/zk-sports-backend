<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone');
            $table->string('company')->nullable();

            // string(20) + PHP enum cast, never a MySQL enum: plan.md §3.6.1.
            $table->string('status', 20)->default('new');
            $table->string('source', 20)->default('website');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();

            $table->char('currency', 3)->default('PKR');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);

            $table->text('customer_note')->nullable();
            $table->text('internal_note')->nullable();

            $table->timestamp('quoted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // The index list is from plan.md §7.1. `(status, created_at)` serves
            // the default listing, which always filters status then sorts newest.
            $table->index(['status', 'created_at']);
            $table->index('customer_email');
            $table->index('assigned_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};

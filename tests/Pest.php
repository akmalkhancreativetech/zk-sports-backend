<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    // Any test that GETs an Inertia page renders the root Blade, which resolves
    // the Vite tag. Without this the suite fails whenever the dev server is not
    // running and `public/build` has not been built — an environment detail
    // that says nothing about the code under test.
    ->beforeEach(fn () => test()->withoutVite())
    ->in('Feature');

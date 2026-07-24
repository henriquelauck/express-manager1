package com.lauckdastele.expressmanager;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocalizacaoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
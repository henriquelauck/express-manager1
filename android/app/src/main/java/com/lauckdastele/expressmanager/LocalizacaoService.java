package com.lauckdastele.expressmanager;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

public class LocalizacaoService extends Service {

    private static final String TAG = "ExpressLocalizacao";
    private static final String CANAL_ID = "express_localizacao";
    private static final int NOTIFICACAO_ID = 1001;

    private FusedLocationProviderClient clienteLocalizacao;
    private LocationCallback callbackLocalizacao;

    @Override
    public void onCreate() {
        super.onCreate();

        criarCanalNotificacao();

        clienteLocalizacao =
                LocationServices.getFusedLocationProviderClient(this);

        callbackLocalizacao = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult resultado) {
                if (resultado == null) {
                    return;
                }

                Location localizacao = resultado.getLastLocation();

                if (localizacao == null) {
                    return;
                }

                Log.d(
                        TAG,
                        "Latitude: " + localizacao.getLatitude()
                                + " | Longitude: " + localizacao.getLongitude()
                                + " | Precisão: " + localizacao.getAccuracy() + " m"
                );
            }
        };
    }

    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId
    ) {
        iniciarComoServicoEmPrimeiroPlano();
        iniciarAtualizacoesLocalizacao();

        return START_STICKY;
    }

    private void iniciarComoServicoEmPrimeiroPlano() {
        Intent abrirAplicativo = new Intent(this, MainActivity.class);

        abrirAplicativo.setFlags(
                Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        int flagsPendingIntent = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flagsPendingIntent |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                abrirAplicativo,
                flagsPendingIntent
        );

        NotificationCompat.Builder notificacao =
                new NotificationCompat.Builder(this, CANAL_ID)
                        .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                        .setContentTitle("Express Manager")
                        .setContentText(
                                "Você está online e compartilhando sua localização."
                        )
                        .setContentIntent(pendingIntent)
                        .setOngoing(true)
                        .setOnlyAlertOnce(true)
                        .setPriority(NotificationCompat.PRIORITY_LOW)
                        .setCategory(NotificationCompat.CATEGORY_SERVICE);

        startForeground(
                NOTIFICACAO_ID,
                notificacao.build()
        );
    }

    private void iniciarAtualizacoesLocalizacao() {
        boolean permissaoPrecisa =
                ActivityCompat.checkSelfPermission(
                        this,
                        Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;

        boolean permissaoAproximada =
                ActivityCompat.checkSelfPermission(
                        this,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;

        if (!permissaoPrecisa && !permissaoAproximada) {
            Log.e(
                    TAG,
                    "Serviço encerrado: permissão de localização não concedida."
            );

            stopSelf();
            return;
        }

        LocationRequest requisicao =
                new LocationRequest.Builder(
                        Priority.PRIORITY_HIGH_ACCURACY,
                        15000L
                )
                        .setMinUpdateIntervalMillis(10000L)
                        .setMinUpdateDistanceMeters(25f)
                        .build();

        clienteLocalizacao.requestLocationUpdates(
                requisicao,
                callbackLocalizacao,
                getMainLooper()
        );
    }

    private void criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel canal = new NotificationChannel(
                CANAL_ID,
                "Localização do motoboy",
                NotificationManager.IMPORTANCE_LOW
        );

        canal.setDescription(
                "Mostra quando o Express Manager está compartilhando a localização."
        );

        NotificationManager gerenciador =
                getSystemService(NotificationManager.class);

        gerenciador.createNotificationChannel(canal);
    }

    @Override
    public void onDestroy() {
        if (
                clienteLocalizacao != null
                        && callbackLocalizacao != null
        ) {
            clienteLocalizacao.removeLocationUpdates(
                    callbackLocalizacao
            );
        }

        Log.d(TAG, "Serviço de localização encerrado.");

        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
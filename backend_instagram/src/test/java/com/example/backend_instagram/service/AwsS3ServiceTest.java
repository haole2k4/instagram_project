package com.example.backend_instagram.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.utils.error.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@ExtendWith(MockitoExtension.class)
class AwsS3ServiceTest {

    @Mock
    private S3Client s3Client;

    private AwsS3Service awsS3Service;

    @BeforeEach
    void setUp() {
        awsS3Service = new AwsS3Service(
                s3Client,
                "instagram-bucket",
                "ap-southeast-1",
                "http://localhost:4566");
    }

    @Test
    void acceptsValidImageAndVideoUploads() {
        MockMultipartFile jpg = new MockMultipartFile(
                "file", "photo.JPG", "image/jpeg", new byte[] { 1, 2, 3 });
        MockMultipartFile webp = new MockMultipartFile(
                "file", "anim.webp", "image/webp", new byte[] { 1, 2, 3 });
        MockMultipartFile mov = new MockMultipartFile(
                "file", "clip.mov", "video/quicktime", new byte[] { 1, 2, 3 });

        AwsS3Service.ValidatedMedia v1 = awsS3Service.validateMediaFile(jpg);
        AwsS3Service.ValidatedMedia v2 = awsS3Service.validateMediaFile(webp);
        AwsS3Service.ValidatedMedia v3 = awsS3Service.validateMediaFile(mov);

        assertThat(v1.mediaType()).isEqualTo("IMAGE");
        assertThat(v1.extension()).isEqualTo(".jpg");
        assertThat(v2.mediaType()).isEqualTo("IMAGE");
        assertThat(v2.extension()).isEqualTo(".webp");
        assertThat(v3.mediaType()).isEqualTo("VIDEO");
        assertThat(v3.extension()).isEqualTo(".mov");
    }

    @Test
    void rejectsDisallowedOrSpoofedUploadsWith400() {
        MockMultipartFile svg = new MockMultipartFile(
                "file", "xss.svg", "image/svg+xml", "<svg/>".getBytes());
        MockMultipartFile html = new MockMultipartFile(
                "file", "page.html", "text/html", "<html/>".getBytes());
        MockMultipartFile js = new MockMultipartFile(
                "file", "evil.js", "application/javascript", "alert(1)".getBytes());
        MockMultipartFile exe = new MockMultipartFile(
                "file", "run.exe", "application/octet-stream", new byte[] { 1 });
        MockMultipartFile mismatch = new MockMultipartFile(
                "file", "fake.png", "image/jpeg", new byte[] { 1 });

        for (MockMultipartFile bad : new MockMultipartFile[] { svg, html, js, exe, mismatch }) {
            assertThatThrownBy(() -> awsS3Service.validateMediaFile(bad))
                    .isInstanceOf(ApiException.class)
                    .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        }

        assertThatThrownBy(() -> awsS3Service.uploadFile("payload.svg", new byte[] { 1 }))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void determineContentTypeSupportsWebpAvifAndExtensionless() {
        assertThat(awsS3Service.determineContentType("pic.webp")).isEqualTo("image/webp");
        assertThat(awsS3Service.determineContentType("pic.avif")).isEqualTo("image/avif");
        assertThat(awsS3Service.determineContentType("no_extension")).isEqualTo("application/octet-stream");
    }

    @Test
    void deleteFilePreservesFolderPrefixFromPathStyleAndVirtualHostedUrls() {
        awsS3Service.deleteFile("http://localhost:4566/instagram-bucket/avatars/abc-123.png");
        awsS3Service.deleteFile("https://instagram-bucket.s3.ap-southeast-1.amazonaws.com/avatars/xyz.jpg");

        ArgumentCaptor<DeleteObjectRequest> captor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client, org.mockito.Mockito.times(2)).deleteObject(captor.capture());

        assertThat(captor.getAllValues().get(0).key()).isEqualTo("avatars/abc-123.png");
        assertThat(captor.getAllValues().get(1).key()).isEqualTo("avatars/xyz.jpg");
    }

    @Test
    void closeClosesS3Client() {
        S3Client client = mock(S3Client.class);
        AwsS3Service service = new AwsS3Service(client, "b", "r", "");
        service.close();
        verify(client).close();
    }
}
